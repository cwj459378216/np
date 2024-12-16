package com.example.web_service.repository;

import com.example.web_service.entity.RuleUpdateConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RuleUpdateConfigRepository extends JpaRepository<RuleUpdateConfig, Long> {
    
    @Query("SELECT r FROM RuleUpdateConfig r ORDER BY r.id DESC LIMIT 1")
    Optional<RuleUpdateConfig> getCurrentConfig();
} 