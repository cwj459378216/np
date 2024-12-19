package com.example.web_service.service;

import com.example.web_service.dto.LocalRuleDTO;
import com.example.web_service.entity.LocalRule;
import com.example.web_service.repository.LocalRuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LocalRuleService {
    
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    @Autowired
    private LocalRuleRepository localRuleRepository;
    
    public List<LocalRuleDTO> getAllRules() {
        return localRuleRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public LocalRuleDTO createRule(LocalRuleDTO ruleDTO) {
        LocalRule rule = convertToEntity(ruleDTO);
        rule.setLastUpdated(LocalDateTime.now());
        return convertToDTO(localRuleRepository.save(rule));
    }
    
    public LocalRuleDTO updateRule(Long id, LocalRuleDTO ruleDTO) {
        LocalRule rule = localRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found"));
        
        rule.setRuleContent(ruleDTO.getRule_content());
        rule.setCategory(ruleDTO.getCategory());
        rule.setStatus(ruleDTO.getStatus());
        rule.setLastUpdated(LocalDateTime.now());
        
        return convertToDTO(localRuleRepository.save(rule));
    }
    
    public void deleteRule(Long id) {
        localRuleRepository.deleteById(id);
    }
    
    public boolean testRule(String ruleContent) {
        return ruleContent != null && 
               ruleContent.contains("alert") && 
               ruleContent.contains("->");
    }
    
    private LocalRuleDTO convertToDTO(LocalRule rule) {
        LocalRuleDTO dto = new LocalRuleDTO();
        dto.setId(rule.getId());
        dto.setRule_content(rule.getRuleContent());
        LocalDateTime createdDateTime = rule.getCreatedDate().atStartOfDay();
        dto.setCreated_date(createdDateTime.format(DATE_TIME_FORMATTER));
        dto.setStatus(rule.getStatus());
        dto.setCategory(rule.getCategory());
        dto.setLast_updated(rule.getLastUpdated().format(DATE_TIME_FORMATTER));
        return dto;
    }
    
    private LocalRule convertToEntity(LocalRuleDTO dto) {
        LocalRule rule = new LocalRule();
        rule.setRuleContent(dto.getRule_content());
        LocalDateTime createdDateTime = LocalDateTime.parse(dto.getCreated_date(), DATE_TIME_FORMATTER);
        rule.setCreatedDate(createdDateTime.toLocalDate());
        rule.setStatus(dto.getStatus());
        rule.setCategory(dto.getCategory());
        rule.setLastUpdated(LocalDateTime.parse(dto.getLast_updated(), DATE_TIME_FORMATTER));
        return rule;
    }
} 