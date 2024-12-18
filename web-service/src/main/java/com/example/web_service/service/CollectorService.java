package com.example.web_service.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.web_service.entity.Collector;
import com.example.web_service.repository.CollectorRepository;
import java.util.List;

@Service
public class CollectorService {
    @Autowired
    private CollectorRepository collectorRepository;
    
    public List<Collector> getAllCollectors() {
        return collectorRepository.findAll();
    }
    
    public Collector saveCollector(Collector collector) {
        return collectorRepository.save(collector);
    }
    
    public void deleteCollector(Long id) {
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
} 