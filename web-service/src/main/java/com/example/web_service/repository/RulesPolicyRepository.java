package com.example.web_service.repository;

import com.example.web_service.entity.RulesPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RulesPolicyRepository extends JpaRepository<RulesPolicy, Long> {
} 