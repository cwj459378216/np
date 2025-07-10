package com.example.web_service.controller;

import com.example.web_service.entity.RuleUpdateConfig;
import com.example.web_service.service.RuleUpdateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/rule-update")
@Tag(name = "规则更新管理", description = "规则更新相关接口")
public class RuleUpdateController {
    
    private final RuleUpdateService ruleUpdateService;
    
    public RuleUpdateController(RuleUpdateService ruleUpdateService) {
        this.ruleUpdateService = ruleUpdateService;
    }
    
    @GetMapping(value = "/config", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "获取当前规则更新配置")
    public ResponseEntity<RuleUpdateConfig> getCurrentConfig() {
        return ResponseEntity.ok(ruleUpdateService.getCurrentConfig());
    }
    
    @PostMapping(value = "/config", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "保存规则更新配置")
    public ResponseEntity<Void> saveConfig(@RequestBody RuleUpdateConfig config) {
        ruleUpdateService.saveConfig(config);
        return ResponseEntity.ok().build();
    }
    
    @PutMapping(value = "/config/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "更新规则更新配置")
    public ResponseEntity<Void> updateConfig(
            @PathVariable Long id,
            @RequestBody RuleUpdateConfig config) {
        config.setId(id);
        ruleUpdateService.saveConfig(config);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping(value = "/update/{configId}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "执行规则更新")
    public ResponseEntity<Void> updateRules(
            @PathVariable Long configId,
            @RequestParam Integer totalRules) {
        ruleUpdateService.updateRules(configId, totalRules);
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping(value = "/config/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "删除规则更新配置")
    public ResponseEntity<Void> deleteConfig(@PathVariable Long id) {
        ruleUpdateService.deleteConfig(id);
        return ResponseEntity.ok().build();
    }
} 