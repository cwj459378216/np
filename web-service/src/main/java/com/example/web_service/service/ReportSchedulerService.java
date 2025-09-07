package com.example.web_service.service;

import com.example.web_service.entity.ReportScheduler;
import com.example.web_service.repository.ReportSchedulerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReportSchedulerService {
    @Autowired
    private ReportSchedulerRepository reportSchedulerRepository;

    public List<ReportScheduler> findAll() {
        return reportSchedulerRepository.findAll();
    }

    public ReportScheduler findById(Long id) {
        return reportSchedulerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Report scheduler not found"));
    }

    public ReportScheduler save(ReportScheduler scheduler) {
        // 如果是更新操作（有ID），需要保留原有的createdAt字段
        if (scheduler.getId() != null) {
            ReportScheduler existingScheduler = reportSchedulerRepository.findById(scheduler.getId())
                .orElseThrow(() -> new RuntimeException("Report scheduler not found"));
            
            // 保留原有的createdAt时间
            scheduler.setCreatedAt(existingScheduler.getCreatedAt());
        }
        
        return reportSchedulerRepository.save(scheduler);
    }

    public void deleteById(Long id) {
        reportSchedulerRepository.deleteById(id);
    }
} 