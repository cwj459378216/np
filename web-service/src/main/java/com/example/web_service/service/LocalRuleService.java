package com.example.web_service.service;

import com.example.web_service.dto.LocalRuleDTO;
import com.example.web_service.entity.LocalRule;
import com.example.web_service.repository.LocalRuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.io.IOException;

@Service
public class LocalRuleService {
    private static final Logger log = LoggerFactory.getLogger(LocalRuleService.class);
    
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    @Autowired
    private LocalRuleRepository localRuleRepository;

    @Value("${suricata.customer.rules.path:/datastore/user/admin/apps/suricata/share/suricata/rules/customer.rules}")
    private String customerRulesPath;
    
    public List<LocalRuleDTO> getAllRules() {
        return localRuleRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public LocalRuleDTO createRule(LocalRuleDTO ruleDTO) {
        LocalRule rule = convertToEntity(ruleDTO);
        rule.setLastUpdated(LocalDateTime.now());
        LocalRule saved = localRuleRepository.save(rule);
        syncEnabledRulesToFile();
        return convertToDTO(saved);
    }
    
    public LocalRuleDTO updateRule(Long id, LocalRuleDTO ruleDTO) {
        LocalRule rule = localRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found"));
        
        rule.setRuleContent(ruleDTO.getRule_content());
        rule.setCategory(ruleDTO.getCategory());
        rule.setStatus(ruleDTO.getStatus());
        rule.setLastUpdated(LocalDateTime.now());
        LocalRule saved = localRuleRepository.save(rule);
        syncEnabledRulesToFile();
        return convertToDTO(saved);
    }
    
    public void deleteRule(Long id) {
        localRuleRepository.deleteById(id);
        syncEnabledRulesToFile();
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

    /**
     * Write all enabled local rules to the configured Suricata customer.rules file.
     * Enabled means status equals 'Enabled' (case-sensitive to match existing data usage).
     */
    private void syncEnabledRulesToFile() {
        List<LocalRule> enabled = localRuleRepository.findByStatus("Enabled");
        List<String> lines = enabled.stream()
                .map(LocalRule::getRuleContent)
                .filter(rc -> rc != null && !rc.trim().isEmpty())
                .map(String::trim)
                .collect(Collectors.toList());

        Path path = Path.of(customerRulesPath);
        try {
            // Ensure parent directories exist
            if (path.getParent() != null && !Files.exists(path.getParent())) {
                Files.createDirectories(path.getParent());
            }
            log.info("Syncing {} enabled local rules to file: {}", lines.size(), path);
            // Write file atomically where possible: write to temp then move
            Path tmp = Files.createTempFile(path.getParent(), "customer", ".rules.tmp");
            Files.write(tmp, lines, StandardOpenOption.TRUNCATE_EXISTING);
            Files.move(tmp, path, java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
            log.info("Successfully synced enabled local rules to {}", path);
        } catch (IOException e) {
            log.warn("Atomic write failed for {}: {}. Falling back to direct write...", path, e.toString());
            // Fallback simple write if atomic move fails or parent null
            try {
                Files.write(path, lines, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
                log.info("Successfully synced (fallback) enabled local rules to {}", path);
            } catch (IOException ex) {
                log.error("Failed to sync enabled local rules to file: {}. Error: {}", path, ex.toString(), ex);
            }
        }
    }
} 