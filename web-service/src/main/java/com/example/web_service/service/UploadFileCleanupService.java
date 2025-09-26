package com.example.web_service.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.example.web_service.repository.CollectorRepository;
import com.example.web_service.config.FileCleanupProperties;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Set;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 上传文件清理定时任务服务
 * 负责定期删除没有被Collector关联的上传文件
 */
@Service
public class UploadFileCleanupService {
    private static final Logger log = LoggerFactory.getLogger(UploadFileCleanupService.class);
    
    @Autowired
    private CollectorRepository collectorRepository;
    
    @Autowired
    private LogService logService;
    
    @Autowired
    private FileCleanupProperties cleanupProperties;
    
    /**
     * 定时清理未关联的上传文件
     * 根据配置的间隔执行，删除超过保留时间且未被关联的文件
     */
    @Scheduled(fixedRateString = "#{@fileCleanupProperties.cleanupInterval}")
    public void cleanupUnusedUploadFiles() {
        try {
            if (!cleanupProperties.isEnabled()) {
                log.debug("File cleanup is disabled, skipping");
                return;
            }
            
            log.info("Starting upload file cleanup task");
            logService.info("system", "FileCleanup", "Upload file cleanup task started");
            
            Path uploadPath = Paths.get(cleanupProperties.getUploadDir());
            if (!Files.exists(uploadPath) || !Files.isDirectory(uploadPath)) {
                log.warn("Upload directory does not exist: {}", cleanupProperties.getUploadDir());
                return;
            }
            
            // 获取所有Collector中关联的文件路径
            Set<String> referencedFilePaths = getReferencedFilePaths();
            log.info("Found {} referenced file paths in collectors", referencedFilePaths.size());
            
            // 计算截止时间
            LocalDateTime cutoffTime = LocalDateTime.now().minusHours(cleanupProperties.getRetentionHours());
            long cutoffMillis = cutoffTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
            
            log.info("Cleaning up files older than {} ({})", cutoffTime, cutoffMillis);
            
            // 扫描上传目录中的文件
            List<Path> filesToDelete;
            try (java.util.stream.Stream<Path> stream = Files.list(uploadPath)) {
                filesToDelete = stream
                    .filter(Files::isRegularFile)
                    .filter(file -> shouldDeleteFile(file, referencedFilePaths, cutoffMillis))
                    .collect(Collectors.toList());
            }
            
            // 删除符合条件的文件
            int deletedCount = 0;
            for (Path file : filesToDelete) {
                try {
                    Files.delete(file);
                    deletedCount++;
                    log.info("Deleted unused upload file: {}", file.toString());
                } catch (Exception e) {
                    log.error("Failed to delete file: {}, error: {}", file.toString(), e.getMessage());
                }
            }
            
            log.info("Upload file cleanup completed. Deleted {} files", deletedCount);
            logService.info("system", "FileCleanup", 
                String.format("Upload file cleanup completed. Deleted %d files", deletedCount));
                
        } catch (Exception e) {
            log.error("Upload file cleanup task failed", e);
            logService.error("system", "FileCleanup", "Upload file cleanup task failed: " + e.getMessage());
        }
    }
    
    /**
     * 获取所有Collector中引用的文件路径
     */
    private Set<String> getReferencedFilePaths() {
        try {
            return collectorRepository.findAll().stream()
                .map(collector -> collector.getFilePath())
                .filter(filePath -> filePath != null && !filePath.trim().isEmpty())
                .collect(Collectors.toSet());
        } catch (Exception e) {
            log.error("Failed to get referenced file paths", e);
            return new HashSet<>();
        }
    }
    
    /**
     * 判断文件是否应该被删除
     * 条件：1. 文件未被任何Collector引用 2. 文件创建时间超过保留期限
     */
    private boolean shouldDeleteFile(Path file, Set<String> referencedFilePaths, long cutoffMillis) {
        try {
            String filePath = file.toString();
            
            // 检查文件是否被引用
            boolean isReferenced = referencedFilePaths.contains(filePath);
            if (isReferenced) {
                log.debug("File is referenced by collector, skipping: {}", filePath);
                return false;
            }
            
            // 检查文件创建时间
            long fileModifiedTime = Files.getLastModifiedTime(file).toMillis();
            boolean isOld = fileModifiedTime < cutoffMillis;
            
            if (!isOld) {
                log.debug("File is too recent, skipping: {} (modified: {})", 
                    filePath, Instant.ofEpochMilli(fileModifiedTime));
                return false;
            }
            
            log.debug("File should be deleted: {} (modified: {}, not referenced)", 
                filePath, Instant.ofEpochMilli(fileModifiedTime));
            return true;
            
        } catch (Exception e) {
            log.error("Error checking file: {}, error: {}", file.toString(), e.getMessage());
            return false; // 出错时不删除文件，保证安全
        }
    }
    
    /**
     * 手动触发文件清理（用于测试或管理员操作）
     */
    public void triggerManualCleanup() {
        log.info("Manual file cleanup trigger requested");
        logService.info("system", "FileCleanup", "Manual file cleanup trigger requested");
        
        try {
            cleanupUnusedUploadFiles();
        } catch (Exception e) {
            log.error("Manual file cleanup trigger failed", e);
            logService.error("system", "FileCleanup", "Manual file cleanup trigger failed: " + e.getMessage());
            throw e;
        }
    }
    
    /**
     * 获取清理统计信息（用于监控和报告）
     */
    public CleanupStats getCleanupStats() {
        try {
            Path uploadPath = Paths.get(cleanupProperties.getUploadDir());
            if (!Files.exists(uploadPath) || !Files.isDirectory(uploadPath)) {
                return new CleanupStats(0, 0, 0);
            }
            
            Set<String> referencedFilePaths = getReferencedFilePaths();
            LocalDateTime cutoffTime = LocalDateTime.now().minusHours(cleanupProperties.getRetentionHours());
            long cutoffMillis = cutoffTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
            
            try (java.util.stream.Stream<Path> stream = Files.list(uploadPath)) {
                List<Path> files = stream.filter(Files::isRegularFile).collect(Collectors.toList());
                
                int totalFiles = files.size();
                int referencedFiles = (int) files.stream()
                    .filter(file -> referencedFilePaths.contains(file.toString()))
                    .count();
                int filesToDelete = (int) files.stream()
                    .filter(file -> shouldDeleteFile(file, referencedFilePaths, cutoffMillis))
                    .count();
                
                return new CleanupStats(totalFiles, referencedFiles, filesToDelete);
            }
            
        } catch (Exception e) {
            log.error("Failed to get cleanup stats", e);
            return new CleanupStats(0, 0, 0);
        }
    }
    
    /**
     * 清理统计信息
     */
    public static class CleanupStats {
        public final int totalFiles;
        public final int referencedFiles;
        public final int filesToDelete;
        
        public CleanupStats(int totalFiles, int referencedFiles, int filesToDelete) {
            this.totalFiles = totalFiles;
            this.referencedFiles = referencedFiles;
            this.filesToDelete = filesToDelete;
        }
    }
}