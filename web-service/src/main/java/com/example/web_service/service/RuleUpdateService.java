package com.example.web_service.service;

import com.example.web_service.entity.RuleUpdateConfig;
import com.example.web_service.repository.RuleUpdateConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
public class RuleUpdateService {
    
    private final RuleUpdateConfigRepository ruleUpdateConfigRepository;
    
    public RuleUpdateService(RuleUpdateConfigRepository ruleUpdateConfigRepository) {
        this.ruleUpdateConfigRepository = ruleUpdateConfigRepository;
    }
    
    public RuleUpdateConfig getCurrentConfig() {
        return ruleUpdateConfigRepository.getCurrentConfig()
            .orElse(null);
    }
    
    @Transactional
    public void saveConfig(RuleUpdateConfig config) {
        if (config.getId() == null) {
            config.setCreatedAt(LocalDateTime.now());
        }
        config.setUpdatedAt(LocalDateTime.now());
        ruleUpdateConfigRepository.save(config);
    }
    
    @Transactional
    public void updateRules(Long configId, Integer totalRules) {
        ruleUpdateConfigRepository.findById(configId).ifPresent(config -> {
            config.setLastUpdateTime(LocalDateTime.now());
            config.setTotalRules(totalRules);
            config.setUpdatedAt(LocalDateTime.now());
            ruleUpdateConfigRepository.save(config);
        });
    }
    
    @Transactional
    public void deleteConfig(Long id) {
        ruleUpdateConfigRepository.deleteById(id);
    }
} 