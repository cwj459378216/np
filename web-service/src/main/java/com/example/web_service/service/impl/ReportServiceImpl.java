package com.example.web_service.service.impl;

import com.example.web_service.entity.Report;
import com.example.web_service.repository.ReportRepository;
import com.example.web_service.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class ReportServiceImpl implements ReportService {
    
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
        reportRepository.deleteById(id);
    }
    
    @Override
    public void deleteByIds(List<Long> ids) {
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
} 