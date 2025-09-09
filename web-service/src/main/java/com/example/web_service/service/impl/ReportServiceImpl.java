package com.example.web_service.service.impl;

import com.example.web_service.entity.Report;
import com.example.web_service.repository.ReportRepository;
import com.example.web_service.service.ReportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReportServiceImpl implements ReportService {
    private static final Logger log = LoggerFactory.getLogger(ReportServiceImpl.class);
    
    @Autowired
    private ReportRepository reportRepository;
    
    @Override
    public List<Report> findAll() {
        return reportRepository.findAll();
    }
    
    @Override
    public Report findById(Long id) {
        return reportRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Report not found"));
    }
    
    @Override
    public Report save(Report report) {
        return reportRepository.save(report);
    }
    
    @Override
    public void deleteById(Long id) {
        // 先尝试删除文件
        reportRepository.findById(id).ifPresent(report -> safeDeleteFile(report.getFilePath(), report.getId()));
        // 再删除数据库记录
        reportRepository.deleteById(id);
    }
    
    @Override
    public void deleteByIds(List<Long> ids) {
        // 先删除文件（逐个）
        for (Report r : reportRepository.findAllById(ids)) {
            safeDeleteFile(r.getFilePath(), r.getId());
        }
        // 再删除数据库记录
        reportRepository.deleteAllById(ids);
    }
    
    @Override
    public Resource loadReportFile(String filePath) {
        try {
            Path file = Paths.get(filePath);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Could not read the file!");
            }
        } catch (Exception e) {
            throw new RuntimeException("Error: " + e.getMessage());
        }
    }

    @Override
    public LocalDateTime getLatestUpdate() {
        return null;
    }

    private void safeDeleteFile(String filePath, Long reportId) {
        if (filePath == null || filePath.isBlank()) {
            log.warn("Report filePath is empty for report id={}", reportId);
            return;
        }
        try {
            Path path = Paths.get(filePath);
            if (java.nio.file.Files.exists(path)) {
                boolean deleted = java.nio.file.Files.deleteIfExists(path);
                if (deleted) {
                    log.info("Deleted report file: {} (report id={})", filePath, reportId);
                } else {
                    log.warn("Failed to delete report file (not deleted): {} (report id={})", filePath, reportId);
                }
            } else {
                log.info("Report file does not exist, skip delete: {} (report id={})", filePath, reportId);
            }
        } catch (Exception e) {
            log.warn("Error deleting report file: {} (report id={}) - {}", filePath, reportId, e.getMessage());
        }
    }
} 