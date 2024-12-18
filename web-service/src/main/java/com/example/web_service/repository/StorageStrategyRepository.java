package com.example.web_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.web_service.entity.StorageStrategy;

public interface StorageStrategyRepository extends JpaRepository<StorageStrategy, Long> {
} 