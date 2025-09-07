package com.example.web_service.repository;

import com.example.web_service.entity.ReportScheduler;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReportSchedulerRepository extends JpaRepository<ReportScheduler, Long> {
    
    // 根据模板名称查找调度器
    List<ReportScheduler> findByTemplate(String template);
    
    // 检查是否存在使用指定模板名称的调度器
    boolean existsByTemplate(String template);
    
    // 统计使用指定模板名称的调度器数量
    long countByTemplate(String template);
} 