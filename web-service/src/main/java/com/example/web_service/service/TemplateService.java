package com.example.web_service.service;

import com.example.web_service.entity.Template;
import com.example.web_service.repository.TemplateRepository;
import com.example.web_service.repository.ReportSchedulerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class TemplateService {
    private static final Logger log = LoggerFactory.getLogger(TemplateService.class);
    
    @Autowired
    private TemplateRepository templateRepository;
    
    @Autowired
    private ReportSchedulerRepository reportSchedulerRepository;

    public List<Template> findAll() {
        return templateRepository.findAll();
    }

    public Template findById(Long id) {
        return templateRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Template not found"));
    }

    public Template save(Template template) {
        return templateRepository.save(template);
    }

    public void deleteById(Long id) {
        log.info("Attempting to delete template with id: {}", id);
        try {
            // 检查模板是否存在
            Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found with id: " + id));
            
            // 检查是否有关联的报告调度器
            // 使用模板名称查询调度器（因为ReportScheduler.template字段存储的是模板名称）
            String templateName = template.getName();
            long relatedSchedulersCount = reportSchedulerRepository.countByTemplate(templateName);
            if (relatedSchedulersCount > 0) {
                log.warn("Cannot delete template '{}' (id: {}) because it has {} related report schedulers", 
                    templateName, id, relatedSchedulersCount);
                throw new RuntimeException("Cannot delete template '" + templateName + "'. There are " + relatedSchedulersCount + 
                    " report scheduler(s) using this template. Please update or delete the related schedulers first.");
            }
            
            templateRepository.deleteById(id);
            log.info("Successfully deleted template '{}' with id: {}", templateName, id);
        } catch (Exception e) {
            log.error("Error deleting template with id {}: {}", id, e.getMessage(), e);
            if (e.getMessage().contains("Cannot delete template")) {
                // 重新抛出用户友好的错误消息
                throw e;
            } else {
                throw new RuntimeException("Failed to delete template with id: " + id + ". " + e.getMessage(), e);
            }
        }
    }

    public List<Template> search(String keyword) {
        return templateRepository.search(keyword);
    }
} 