package com.example.web_service.controller;

import com.example.web_service.entity.NotificationRule;
import com.example.web_service.service.NotificationRuleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController
@RequestMapping("/notification-rules")
@Tag(name = "通知规则", description = "通知规则的增删改查操作")
@CrossOrigin(origins = "*")
public class NotificationRuleController {

    @Autowired
    private NotificationRuleService notificationRuleService;

    @Autowired
    private com.example.web_service.service.NotificationRuleSchedulerService notificationRuleSchedulerService;

    @GetMapping
    @Operation(summary = "获取所有规则")
    public List<NotificationRule> getAllRules() {
        return notificationRuleService.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取单个规则")
    public NotificationRule getRule(@PathVariable Long id) {
        return notificationRuleService.findById(id);
    }

    @PostMapping
    @Operation(summary = "创建规则")
    public NotificationRule createRule(@RequestBody NotificationRule rule) {
        NotificationRule saved = notificationRuleService.save(rule);
        // schedule at updatedAt + timeWindow
        notificationRuleSchedulerService.scheduleRule(saved.getId());
        return saved;
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新规则")
    public NotificationRule updateRule(@PathVariable Long id, @RequestBody NotificationRule rule) {
        rule.setId(id);
        NotificationRule saved = notificationRuleService.save(rule);
        notificationRuleSchedulerService.scheduleRule(saved.getId());
        return saved;
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除规则")
    public void deleteRule(@PathVariable Long id) {
        notificationRuleService.deleteById(id);
        notificationRuleSchedulerService.cancelRule(id);
    }
}