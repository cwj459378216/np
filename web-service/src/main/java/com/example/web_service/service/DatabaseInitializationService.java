package com.example.web_service.service;

import com.example.web_service.entity.RulesPolicy;
import com.example.web_service.repository.RulesPolicyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;

@Service
public class DatabaseInitializationService implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DatabaseInitializationService.class);

    @Autowired
    private RulesPolicyRepository rulesPolicyRepository;

    @Autowired
    private RulesPolicyService rulesPolicyService;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        log.info("Starting database initialization check...");
        initializeDefaultRulesPolicy();
        log.info("Database initialization check completed.");
    }

    private void initializeDefaultRulesPolicy() {
        try {
            // 检查是否已存在规则策略
            long policyCount = rulesPolicyRepository.count();
            log.info("Found {} existing rules policies", policyCount);

            if (policyCount == 0) {
                log.info("No rules policies found, creating default policy...");
                createDefaultRulesPolicy();
            } else {
                log.info("Rules policies already exist, skipping default creation");
            }
        } catch (Exception e) {
            log.error("Error during default rules policy initialization", e);
            throw new RuntimeException("Failed to initialize default rules policy", e);
        }
    }

    private void createDefaultRulesPolicy() {
        try {
            // 只查询规则的ID，避免加载大量数据
            List<Long> allRuleIds = entityManager.createQuery(
                "SELECT r.id FROM com.example.web_service.entity.Rule r", Long.class)
                .getResultList();
            log.info("Found {} total rules to associate with default policy", allRuleIds.size());

            if (allRuleIds.isEmpty()) {
                log.warn("No rules found in suricata_rules table, skipping default policy creation");
                return;
            }

            // 第一步：创建默认策略（不设置关联关系）
            RulesPolicy defaultPolicy = new RulesPolicy();
            defaultPolicy.setName("默认规则策略");
            defaultPolicy.setDescription("系统自动创建的默认规则策略，包含所有可用规则");
            defaultPolicy.setEnabled(true);
            defaultPolicy.setIsDefault(true);

            // 先保存策略本身
            RulesPolicy savedPolicy = rulesPolicyRepository.save(defaultPolicy);
            log.info("Successfully created default rules policy with ID: {}", savedPolicy.getId());

            // 第二步：批量插入关联关系到 policy_rules 表
            entityManager.flush(); // 确保策略已经保存到数据库
            
            int batchSize = 10000; // 批量处理大小
            int count = 0;
            
            for (Long ruleId : allRuleIds) {
                // 使用原生 SQL 插入关联关系
                entityManager.createNativeQuery(
                    "INSERT INTO policy_rules (policy_id, rule_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)")
                    .setParameter(1, savedPolicy.getId())
                    .setParameter(2, ruleId)
                    .executeUpdate();
                
                count++;
                
                // 批量提交
                if (count % batchSize == 0) {
                    entityManager.flush();
                    entityManager.clear();
                    log.info("Processed {} rule associations", count);
                }
            }
            
            // 提交剩余的关联关系
            entityManager.flush();
            entityManager.clear();
            
            log.info("Successfully associated {} rules with default policy ID: {}", 
                    allRuleIds.size(), savedPolicy.getId());

            // 验证关联关系是否正确建立
            Object countResult = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM policy_rules WHERE policy_id = ?")
                .setParameter(1, savedPolicy.getId())
                .getSingleResult();
            Long associationCount = ((Number) countResult).longValue();
            
            log.info("Verification: Default policy now has {} associated rules in database", associationCount);

            // 由于默认策略是启用的，应该自动写入规则文件
            // 通过调用 updateStatus 来触发规则文件的写入
            rulesPolicyService.updateStatus(savedPolicy.getId(), true);
            log.info("Default policy rules have been written to Suricata rules file");

        } catch (Exception e) {
            log.error("Error creating default rules policy", e);
            throw new RuntimeException("Failed to create default rules policy", e);
        }
    }
}