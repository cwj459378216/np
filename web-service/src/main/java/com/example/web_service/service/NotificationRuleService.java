package com.example.web_service.service;

import com.example.web_service.entity.NotificationRule;
import com.example.web_service.repository.NotificationRuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class NotificationRuleService {
    
    @Autowired
    private NotificationRuleRepository notificationRuleRepository;

    public List<NotificationRule> findAll() {
        return notificationRuleRepository.findAll();
    }

    public NotificationRule findById(Long id) {
        return notificationRuleRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Notification rule not found"));
    }

    public NotificationRule save(NotificationRule rule) {
        return notificationRuleRepository.save(rule);
    }

    public void deleteById(Long id) {
        notificationRuleRepository.deleteById(id);
    }
} 