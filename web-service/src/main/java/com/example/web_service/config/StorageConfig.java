package com.example.web_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;
import java.io.File;

@Configuration
public class StorageConfig {
    
    @Value("${app.report.storage.path}")
    private String reportStoragePath;
    
    @PostConstruct
    public void init() {
        File directory = new File(reportStoragePath);
        if (!directory.exists()) {
            directory.mkdirs();
        }
    }
} 