package com.example.web_service.controller;

import com.example.web_service.dto.LocalRuleDTO;
import com.example.web_service.service.LocalRuleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/local-rules")
public class LocalRuleController {
    
    @Autowired
    private LocalRuleService localRuleService;
    
    @GetMapping
    public ResponseEntity<List<LocalRuleDTO>> getAllRules() {
        return ResponseEntity.ok(localRuleService.getAllRules());
    }
    
    @PostMapping
    public ResponseEntity<LocalRuleDTO> createRule(@RequestBody LocalRuleDTO rule) {
        return ResponseEntity.ok(localRuleService.createRule(rule));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<LocalRuleDTO> updateRule(@PathVariable Long id, @RequestBody LocalRuleDTO rule) {
        return ResponseEntity.ok(localRuleService.updateRule(id, rule));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        localRuleService.deleteRule(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/test")
    public ResponseEntity<Boolean> testRule(@RequestBody String ruleContent) {
        return ResponseEntity.ok(localRuleService.testRule(ruleContent));
    }
} 