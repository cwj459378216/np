package com.example.web_service.service;

import com.example.web_service.entity.Report;
import org.springframework.core.io.Resource;
import java.util.List;
import java.time.LocalDateTime;

public interface ReportService {
    List<Report> findAll();
    Report findById(Long id);
    Report save(Report report);
    void deleteById(Long id);
    void deleteByIds(List<Long> ids);
    Resource loadReportFile(String filePath);
    LocalDateTime getLatestUpdate();
} 