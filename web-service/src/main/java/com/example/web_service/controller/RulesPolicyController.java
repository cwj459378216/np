package com.example.web_service.controller;

import com.example.web_service.entity.Rule;
import com.example.web_service.entity.RulesPolicy;
import com.example.web_service.service.RulesPolicyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/rules-policy")
@Tag(name = "规则策略", description = "规则策略的增删改查操作")
@CrossOrigin(origins = "*")
public class RulesPolicyController {
    private static final Logger log = LoggerFactory.getLogger(RulesPolicyController.class);

    @Autowired
    private RulesPolicyService rulesPolicyService;

    @GetMapping
    @Operation(summary = "获取所有策略")
    public List<RulesPolicy> getAllPolicies() {
        return rulesPolicyService.findAll();
    }

    @GetMapping("/rules")
    @Operation(summary = "获取所有可用规则")
    public List<Rule> getAllRules() {
        try {
            List<Rule> rules = rulesPolicyService.getAllRules();
            log.info("Returning {} rules", rules.size());
            return rules;
        } catch (Exception e) {
            log.error("Error getting rules", e);
            throw e;
        }
    }

    @PostMapping
    @Operation(summary = "创建策略")
    public RulesPolicy createPolicy(@RequestBody RulesPolicy policy) {
        return rulesPolicyService.save(policy);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新策略")
    public RulesPolicy updatePolicy(@PathVariable Long id, @RequestBody RulesPolicy policy) {
        policy.setId(id);
        return rulesPolicyService.save(policy);
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "更新策略状态")
    public RulesPolicy updatePolicyStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> status) {
        return rulesPolicyService.updateStatus(id, status.get("enabled"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除策略")
    public void deletePolicy(@PathVariable Long id) {
        rulesPolicyService.deleteById(id);
    }

    // ... 其他方法
} 