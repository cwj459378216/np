package com.example.web_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.web_service.entity.Collector;

public interface CollectorRepository extends JpaRepository<Collector, Long> {
} 