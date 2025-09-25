package com.example.web_service.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.web_service.entity.Collector;
import com.example.web_service.repository.CollectorRepository;
import java.util.List;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class CollectorService {
    private static final Logger logger = LoggerFactory.getLogger(CollectorService.class);
    
    @Autowired
    private CollectorRepository collectorRepository;
    
    public List<Collector> getAllCollectors() {
        return collectorRepository.findAll();
    }
    
    public Collector saveCollector(Collector collector) {
        return collectorRepository.save(collector);
    }
    
    public void deleteCollector(Long id) {
        // First get the collector to check if it has a filePath
        Collector collector = getCollectorById(id);
        
        // Delete the associated file if filePath is not empty
        if (collector.getFilePath() != null && !collector.getFilePath().trim().isEmpty()) {
            try {
                Path filePath = Paths.get(collector.getFilePath());
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                    logger.info("Successfully deleted file: {}", collector.getFilePath());
                } else {
                    logger.warn("File not found, skipping deletion: {}", collector.getFilePath());
                }
            } catch (IOException e) {
                logger.error("Failed to delete file: {}, error: {}", collector.getFilePath(), e.getMessage());
                // Continue with collector deletion even if file deletion fails
            }
        }
        
        // Delete the collector record from database
        collectorRepository.deleteById(id);
    }
    
    public Collector getCollectorById(Long id) {
        return collectorRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Collector not found"));
    }
    
    public void updateStatus(Long id, String status) {
        Collector collector = getCollectorById(id);
        collector.setStatus(status);
        collectorRepository.save(collector);
    }
    
    public void updateSessionId(Long id, String sessionId) {
        Collector collector = getCollectorById(id);
        collector.setSessionId(sessionId);
        collectorRepository.save(collector);
    }
} 