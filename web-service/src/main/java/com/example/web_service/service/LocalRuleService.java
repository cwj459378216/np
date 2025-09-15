package com.example.web_service.service;

import com.example.web_service.dto.LocalRuleDTO;
import com.example.web_service.entity.LocalRule;
import com.example.web_service.dto.RuleTestResultDTO;
import com.example.web_service.repository.LocalRuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
import java.util.Map;

@Service
public class LocalRuleService {
    private static final Logger log = LoggerFactory.getLogger(LocalRuleService.class);
    
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    @Autowired
    private LocalRuleRepository localRuleRepository;

    @Value("${suricata.customer.rules.path:/datastore/user/admin/apps/suricata/share/suricata/rules/customer.rules}")
    private String customerRulesPath;
    
    @Value("${third-party.base-url}")
    private String thirdPartyBaseUrl;

    @Autowired
    private RestTemplate restTemplate;
    
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
    
    public RuleTestResultDTO testRule(String ruleContent) {
        if (ruleContent == null || ruleContent.trim().isEmpty()) {
            return new RuleTestResultDTO(false, "rule_content is empty");
        }

        Path tmpRulePath = Path.of("/tmp/loadrules.rules");
        try {
            Files.write(tmpRulePath, List.of(ruleContent.trim()), StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
        } catch (IOException e) {
            log.error("Failed writing test rule to {}: {}", tmpRulePath, e.toString(), e);
            return new RuleTestResultDTO(false, "write rule file failed: " + e.getMessage());
        }

        String base = thirdPartyBaseUrl != null ? thirdPartyBaseUrl.replaceAll("/+?$", "") : "";
        String url = base + "/checkSuricataRule";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = String.format("{\"ruleFilePath\":\"%s\"}", tmpRulePath.toString());
        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<Object> response = restTemplate.postForEntity(url, entity, Object.class);
            Object bodyObj = response.getBody();
            if (bodyObj == null) {
                return new RuleTestResultDTO(false, "empty response");
            }
            if (bodyObj instanceof Boolean) {
                return new RuleTestResultDTO((Boolean) bodyObj, null);
            }
            if (bodyObj instanceof Map) {
                Map<?, ?> map = (Map<?, ?>) bodyObj;
                Boolean success = null;
                // 1) Common boolean-bearing keys
                Object[] keys = new Object[] {"valid", "isValid", "success", "result", "data"};
                for (Object k : keys) {
                    if (map.containsKey(k)) {
                        Object v = map.get(k);
                        if (v instanceof Boolean) success = (Boolean) v;
                        else if (v instanceof String) success = Boolean.parseBoolean(((String) v).trim());
                        if (success != null) break;
                    }
                }
                // 2) Numeric error code conventions: error == 0 means success
                if (success == null && map.containsKey("error")) {
                    Object err = map.get("error");
                    if (err instanceof Number) {
                        success = ((Number) err).intValue() == 0;
                    } else if (err instanceof String) {
                        try {
                            success = Integer.parseInt(((String) err).trim()) == 0;
                        } catch (NumberFormatException ignore) {}
                    }
                }
                // 3) Status strings
                if (success == null && map.containsKey("status")) {
                    Object st = map.get("status");
                    if (st instanceof String) {
                        String s = ((String) st).trim().toLowerCase();
                        if ("ok".equals(s) || "success".equals(s)) success = true;
                        if ("error".equals(s) || "fail".equals(s) || "failed".equals(s)) success = false;
                    }
                }
                String message = null;
                Object msg = map.get("message");
                if (msg instanceof String) message = (String) msg;
                if (success == null) {
                    log.warn("Unexpected response map from Suricata rule check: {}", map);
                    return new RuleTestResultDTO(false, message != null ? message : "unexpected response");
                }
                return new RuleTestResultDTO(success, message);
            }
            if (bodyObj instanceof String) {
                String str = ((String) bodyObj).trim();
                if ("true".equalsIgnoreCase(str) || "false".equalsIgnoreCase(str)) {
                    return new RuleTestResultDTO(Boolean.parseBoolean(str), null);
                }
                return new RuleTestResultDTO(false, str);
            }
            log.warn("Unexpected response format from Suricata rule check: {}", bodyObj);
            return new RuleTestResultDTO(false, "unexpected response");
        } catch (Exception ex) {
            log.error("Error calling Suricata rule check at {}: {}", url, ex.toString(), ex);
            return new RuleTestResultDTO(false, ex.getMessage());
        }
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