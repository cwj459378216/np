package com.example.web_service.repository;

import com.example.web_service.entity.ReportScheduler;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportSchedulerRepository extends JpaRepository<ReportScheduler, Long> {
} 