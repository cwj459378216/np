package com.example.web_service.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.web_service.entity.StorageStrategy;
import com.example.web_service.repository.StorageStrategyRepository;
import java.util.List;

@Service
public class StorageStrategyService {
    @Autowired
    private StorageStrategyRepository storageStrategyRepository;
    
    public List<StorageStrategy> getAllStorageStrategies() {
        return storageStrategyRepository.findAll();
    }
    
    public StorageStrategy saveStorageStrategy(StorageStrategy strategy) {
        return storageStrategyRepository.save(strategy);
    }
    
    public void deleteStorageStrategy(Long id) {
        storageStrategyRepository.deleteById(id);
    }
    
    public StorageStrategy getStorageStrategyById(Long id) {
        return storageStrategyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Storage strategy not found"));
    }
} 