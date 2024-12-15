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
        return reportSchedulerRepository.save(scheduler);
    }

    public void deleteById(Long id) {
        reportSchedulerRepository.deleteById(id);
    }
} 