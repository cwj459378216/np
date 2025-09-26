package com.example.web_service.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.web_service.service.UploadFileCleanupService;
import com.example.web_service.config.FileCleanupProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.Map;

@RestController
@RequestMapping("/file-cleanup")
@Tag(name = "文件清理管理", description = "用于管理上传文件的定期清理")
public class FileCleanupController {
    
    @Autowired
    private UploadFileCleanupService uploadFileCleanupService;
    
    @Autowired
    private FileCleanupProperties cleanupProperties;
    
    /**
     * 手动触发文件清理
     */
    @PostMapping("/trigger")
    @Operation(summary = "手动触发文件清理", description = "立即执行上传文件清理任务")
    public Map<String, String> triggerCleanup() {
        try {
            uploadFileCleanupService.triggerManualCleanup();
            return Map.of("message", "File cleanup triggered successfully");
        } catch (Exception e) {
            return Map.of("error", "File cleanup failed: " + e.getMessage());
        }
    }
    
    /**
     * 获取清理统计信息
     */
    @GetMapping("/stats")
    @Operation(summary = "获取清理统计信息", description = "查看当前上传目录的文件统计信息")
    public UploadFileCleanupService.CleanupStats getCleanupStats() {
        return uploadFileCleanupService.getCleanupStats();
    }
    
    /**
     * 获取清理配置信息
     */
    @GetMapping("/config")
    @Operation(summary = "获取清理配置信息", description = "查看文件清理的配置参数")
    public Map<String, Object> getCleanupConfig() {
        return Map.of(
            "uploadDirectory", cleanupProperties.getUploadDir(),
            "retentionHours", cleanupProperties.getRetentionHours(),
            "cleanupIntervalMs", cleanupProperties.getCleanupInterval(),
            "enabled", cleanupProperties.isEnabled(),
            "description", String.format("Files older than %d hours and not referenced by any collector will be deleted", 
                cleanupProperties.getRetentionHours())
        );
    }
}