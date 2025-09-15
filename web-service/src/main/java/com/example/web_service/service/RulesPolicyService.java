package com.example.web_service.service;

import com.example.web_service.entity.Rule;
import com.example.web_service.entity.RulesPolicy;
import com.example.web_service.repository.RuleRepository;
import com.example.web_service.repository.RulesPolicyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.charset.StandardCharsets;

@Service
public class RulesPolicyService {
    private static final Logger log = LoggerFactory.getLogger(RulesPolicyService.class);

    private static final String SURICATA_RULES_PATH = "/datastore/user/admin/apps/suricata/share/suricata/load_rules.rules";

    @Autowired
    private RuleRepository ruleRepository;

    @Autowired
    private RulesPolicyRepository rulesPolicyRepository;

    public List<RulesPolicy> findAll() {
        return rulesPolicyRepository.findAll();
    }

    public List<Rule> getAllRules() {
        try {
            List<Rule> rules = ruleRepository.findAll();
            log.info("Found {} rules", rules.size());
            return rules;
        } catch (Exception e) {
            log.error("Error getting rules", e);
            throw e;
        }
    }

    public Page<Rule> getRulesPaginated(Pageable pageable, String search) {
        try {
            Page<Rule> rulesPage;
            if (search != null && !search.trim().isEmpty()) {
                // 这里可以根据需要实现搜索逻辑，比如按SID、协议、消息等字段搜索
                // 暂时使用简单的findAll，后续可以添加自定义查询
                rulesPage = ruleRepository.findAll(pageable);
            } else {
                // 按SID排序
                Pageable sortedPageable = PageRequest.of(
                    pageable.getPageNumber(), 
                    pageable.getPageSize(), 
                    Sort.by("sid").ascending()
                );
                rulesPage = ruleRepository.findAll(sortedPageable);
            }
            log.info("Found {} rules for page {} of {} with search: {}", 
                rulesPage.getContent().size(), pageable.getPageNumber(), rulesPage.getTotalPages(), search);
            return rulesPage;
        } catch (Exception e) {
            log.error("Error getting paginated rules", e);
            throw e;
        }
    }

    public RulesPolicy save(RulesPolicy policy) {
        if (policy.getId() != null) {
            RulesPolicy existingPolicy = rulesPolicyRepository.findById(policy.getId())
                .orElseThrow(() -> new RuntimeException("Policy not found"));
            
            if (policy.getRules() == null || policy.getRules().isEmpty()) {
                policy.setRules(existingPolicy.getRules());
            }
        }
        
        if (policy.getRules() != null && !policy.getRules().isEmpty()) {
            List<Rule> rules = policy.getRules().stream()
                .map(rule -> ruleRepository.findById(rule.getId())
                    .orElseThrow(() -> new RuntimeException("Rule not found: " + rule.getId())))
                .toList();
            policy.setRules(rules);
        }
        
        return rulesPolicyRepository.save(policy);
    }

    public void deleteById(Long id) {
        rulesPolicyRepository.deleteById(id);
    }

    public RulesPolicy updateStatus(Long id, Boolean enabled) {
        return updateStatusAndSyncRulesFile(id, enabled);
    }

    // ... 其他方法

    @Transactional
    protected RulesPolicy updateStatusAndSyncRulesFile(Long id, Boolean enabled) {
        RulesPolicy targetPolicy = rulesPolicyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Policy not found"));

        // If enabling a policy, disable all others first to enforce mutual exclusivity
        if (Boolean.TRUE.equals(enabled)) {
            List<RulesPolicy> allPolicies = rulesPolicyRepository.findAll();
            for (RulesPolicy p : allPolicies) {
                if (!Objects.equals(p.getId(), id) && Boolean.TRUE.equals(p.getEnabled())) {
                    p.setEnabled(false);
                }
            }
            rulesPolicyRepository.saveAll(allPolicies);

            // Enable the target policy
            targetPolicy.setEnabled(true);
            targetPolicy = rulesPolicyRepository.save(targetPolicy);

            // Write rules of the enabled policy to Suricata rules file
            try {
                writeRulesToSuricataFile(targetPolicy.getRules());
            } catch (Exception e) {
                log.error("Failed to write Suricata rules file", e);
                throw new RuntimeException("Failed to write Suricata rules file", e);
            }
        } else {
            // Disabling the target policy
            targetPolicy.setEnabled(false);
            targetPolicy = rulesPolicyRepository.save(targetPolicy);

            // If no policy is enabled now, clear the rules file
            boolean anyEnabled = rulesPolicyRepository.findAll().stream().anyMatch(RulesPolicy::getEnabled);
            if (!anyEnabled) {
                try {
                    clearSuricataRulesFile();
                } catch (Exception e) {
                    log.error("Failed to clear Suricata rules file", e);
                    throw new RuntimeException("Failed to clear Suricata rules file", e);
                }
            }
        }

        return targetPolicy;
    }

    private void writeRulesToSuricataFile(List<Rule> rules) throws Exception {
        if (rules == null || rules.isEmpty()) {
            clearSuricataRulesFile();
            return;
        }

        String content = rules.stream()
            .map(Rule::getRule)
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.joining(System.lineSeparator())) + System.lineSeparator();

        Path path = Path.of(SURICATA_RULES_PATH);
        Files.createDirectories(path.getParent());
        Files.write(path, content.getBytes(StandardCharsets.UTF_8), StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        log.info("Wrote {} rules to {}", rules.size(), SURICATA_RULES_PATH);
    }

    private void clearSuricataRulesFile() throws Exception {
        Path path = Path.of(SURICATA_RULES_PATH);
        Files.createDirectories(path.getParent());
        Files.write(path, new byte[0], StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        log.info("Cleared Suricata rules file {}", SURICATA_RULES_PATH);
    }
} 