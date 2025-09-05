package com.example.web_service.repository;

import com.example.web_service.entity.LocalRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LocalRuleRepository extends JpaRepository<LocalRule, Long> {
	List<LocalRule> findByStatus(String status);
} 