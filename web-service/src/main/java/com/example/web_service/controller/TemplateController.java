package com.example.web_service.controller;

import com.example.web_service.entity.Template;
import com.example.web_service.service.TemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController
@RequestMapping("/api/templates")
@Tag(name = "模板管理", description = "模板的增删改查操作")
@CrossOrigin(origins = "*")
public class TemplateController {

    @Autowired
    private TemplateService templateService;

    @GetMapping
    @Operation(summary = "获取所有模板")
    public List<Template> getAllTemplates() {
        return templateService.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取单个模板")
    public Template getTemplateById(@PathVariable Long id) {
        return templateService.findById(id);
    }

    @PostMapping
    @Operation(summary = "创建模板")
    public Template createTemplate(@RequestBody Template template) {
        return templateService.save(template);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新模板")
    public Template updateTemplate(@PathVariable Long id, @RequestBody Template template) {
        template.setId(id);
        return templateService.save(template);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除模板")
    public void deleteTemplate(@PathVariable Long id) {
        templateService.deleteById(id);
    }

    @GetMapping("/search")
    @Operation(summary = "搜索模板")
    public List<Template> searchTemplates(@RequestParam String keyword) {
        return templateService.search(keyword);
    }
} 