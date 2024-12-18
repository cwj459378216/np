package com.example.web_service.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.web_service.entity.StorageStrategy;
import com.example.web_service.service.StorageStrategyService;
import java.util.List;

@RestController
@RequestMapping("/api/storage-strategies")
public class StorageStrategyController {
    @Autowired
    private StorageStrategyService storageStrategyService;
    
    @GetMapping
    public List<StorageStrategy> getAllStorageStrategies() {
        return storageStrategyService.getAllStorageStrategies();
    }
    
    @PostMapping
    public StorageStrategy createStorageStrategy(@RequestBody StorageStrategy strategy) {
        return storageStrategyService.saveStorageStrategy(strategy);
    }
    
    @DeleteMapping("/{id}")
    public void deleteStorageStrategy(@PathVariable Long id) {
        storageStrategyService.deleteStorageStrategy(id);
    }
    
    @GetMapping("/{id}")
    public StorageStrategy getStorageStrategyById(@PathVariable Long id) {
        return storageStrategyService.getStorageStrategyById(id);
    }
    
    @PutMapping("/{id}")
    public StorageStrategy updateStorageStrategy(@PathVariable Long id, @RequestBody StorageStrategy strategy) {
        strategy.setId(id);
        return storageStrategyService.saveStorageStrategy(strategy);
    }
} 