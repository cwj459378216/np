package com.example.web_service.repository;

import com.example.web_service.entity.NotificationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRuleRepository extends JpaRepository<NotificationRule, Long> {
} 