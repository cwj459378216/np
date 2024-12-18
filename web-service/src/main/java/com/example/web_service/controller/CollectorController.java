package com.example.web_service.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.web_service.entity.Collector;
import com.example.web_service.service.CollectorService;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/collectors")
public class CollectorController {
    @Autowired
    private CollectorService collectorService;
    
    @GetMapping
    public List<Collector> getAllCollectors() {
        return collectorService.getAllCollectors();
    }
    
    @PostMapping
    public Collector createCollector(@RequestBody Collector collector) {
        return collectorService.saveCollector(collector);
    }
    
    @DeleteMapping("/{id}")
    public void deleteCollector(@PathVariable Long id) {
        collectorService.deleteCollector(id);
    }
    
    @GetMapping("/{id}")
    public Collector getCollectorById(@PathVariable Long id) {
        return collectorService.getCollectorById(id);
    }
    
    @PutMapping("/{id}")
    public Collector updateCollector(@PathVariable Long id, @RequestBody Collector collector) {
        collector.setId(id);
        return collectorService.saveCollector(collector);
    }
    
    @PutMapping("/{id}/status")
    public void updateStatus(@PathVariable Long id, @RequestBody Map<String, String> status) {
        collectorService.updateStatus(id, status.get("status"));
    }
    
    @PutMapping("/{id}/protocol-analysis-enabled")
    public void updateProtocolAnalysisEnabled(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Collector collector = collectorService.getCollectorById(id);
        collector.setProtocolAnalysisEnabled(body.get("enabled"));
        collectorService.saveCollector(collector);
    }
    
    @PutMapping("/{id}/ids-enabled")
    public void updateIdsEnabled(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Collector collector = collectorService.getCollectorById(id);
        collector.setIdsEnabled(body.get("enabled"));
        collectorService.saveCollector(collector);
    }
} 