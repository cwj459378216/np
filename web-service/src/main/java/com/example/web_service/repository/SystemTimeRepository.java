package com.example.web_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.web_service.entity.SystemTime;

public interface SystemTimeRepository extends JpaRepository<SystemTime, Long> {
    SystemTime findFirstByOrderByIdDesc();
} 