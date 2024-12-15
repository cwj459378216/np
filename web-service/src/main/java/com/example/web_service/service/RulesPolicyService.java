package com.example.web_service.service;

import com.example.web_service.entity.Rule;
import com.example.web_service.entity.RulesPolicy;
import com.example.web_service.repository.RuleRepository;
import com.example.web_service.repository.RulesPolicyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RulesPolicyService {
    private static final Logger log = LoggerFactory.getLogger(RulesPolicyService.class);

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
        RulesPolicy policy = rulesPolicyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Policy not found"));
        policy.setEnabled(enabled);
        return rulesPolicyRepository.save(policy);
    }

    // ... 其他方法
} 