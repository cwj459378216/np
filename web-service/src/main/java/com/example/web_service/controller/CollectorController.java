package com.example.web_service.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.web_service.entity.Collector;
import com.example.web_service.service.CollectorService;
import com.example.web_service.service.LogService;
import com.example.web_service.service.EsDeletionTaskService;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/collectors")
public class CollectorController {
    @Autowired
    private CollectorService collectorService;
    @Autowired
    private LogService logService;
    @Autowired
    private EsDeletionTaskService esDeletionTaskService;
    
    @GetMapping
    public List<Collector> getAllCollectors() {
        return collectorService.getAllCollectors();
    }
    
    @PostMapping
    public Collector createCollector(@RequestBody Collector collector) {
    Collector saved = collectorService.saveCollector(collector);
    logService.info("admin", "Collector", "Create collector: " + saved.getName());
    return saved;
    }
    
    @DeleteMapping("/{id}")
    public void deleteCollector(@PathVariable Long id) {
        // Delete collector record and associated file (if filePath is not empty). ES deletion is handled by async endpoints.
        collectorService.deleteCollector(id);
        logService.warn("admin", "Collector", "Delete collector id=" + id);
    }

    // Start async ES deletion by collectorId
    @PostMapping("/{id}/es-delete")
    public Map<String, String> startEsDeletion(@PathVariable Long id) {
        String taskId = esDeletionTaskService.startDeletion(id);
        logService.info("admin", "Collector", "Start ES deletion for collector id=" + id + ", taskId=" + taskId);
        return java.util.Map.of("taskId", taskId);
    }

    // Query async deletion status
    @GetMapping("/es-delete/{taskId}")
    public EsDeletionTaskService.TaskStatus getEsDeletionStatus(@PathVariable String taskId) {
        return esDeletionTaskService.getStatus(taskId);
    }
    
    @GetMapping("/{id}")
    public Collector getCollectorById(@PathVariable Long id) {
        return collectorService.getCollectorById(id);
    }
    
    @PutMapping("/{id}")
    public Collector updateCollector(@PathVariable Long id, @RequestBody Collector collector) {
        collector.setId(id);
    Collector saved = collectorService.saveCollector(collector);
    logService.info("admin", "Collector", "Update collector: " + saved.getName());
    return saved;
    }
    
    @PutMapping("/{id}/status")
    public void updateStatus(@PathVariable Long id, @RequestBody Map<String, String> status) {
        collectorService.updateStatus(id, status.get("status"));
    logService.info("admin", "Collector", "Update status of id=" + id + " to " + status.get("status"));
    }
    
    @PutMapping("/{id}/protocol-analysis-enabled")
    public void updateProtocolAnalysisEnabled(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Collector collector = collectorService.getCollectorById(id);
        collector.setProtocolAnalysisEnabled(body.get("enabled"));
        collectorService.saveCollector(collector);
    logService.info("admin", "Collector", "Set protocolAnalysisEnabled of id=" + id + " to " + body.get("enabled"));
    }
    
    @PutMapping("/{id}/ids-enabled")
    public void updateIdsEnabled(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Collector collector = collectorService.getCollectorById(id);
        collector.setIdsEnabled(body.get("enabled"));
        collectorService.saveCollector(collector);
    logService.info("admin", "Collector", "Set idsEnabled of id=" + id + " to " + body.get("enabled"));
    }
    
    @PutMapping("/{id}/session")
    public void updateSessionId(@PathVariable Long id, @RequestBody Map<String, String> session) {
        collectorService.updateSessionId(id, session.get("sessionId"));
    logService.info("admin", "Collector", "Update sessionId of id=" + id);
    }
} 