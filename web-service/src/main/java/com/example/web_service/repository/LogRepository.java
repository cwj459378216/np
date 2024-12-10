package com.example.web_service.repository;

import com.example.web_service.entity.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LogRepository extends JpaRepository<SystemLog, Long> {
} 