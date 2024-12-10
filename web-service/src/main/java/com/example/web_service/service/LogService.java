package com.example.web_service.service;

import com.example.web_service.entity.SystemLog;
import com.example.web_service.repository.LogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LogService {
    
    @Autowired
    private LogRepository logRepository;

    public List<SystemLog> findAll() {
        return logRepository.findAll();
    }

    public SystemLog findById(Long id) {
        return logRepository.findById(id).orElse(null);
    }

    public SystemLog save(SystemLog systemLog) {
        return logRepository.save(systemLog);
    }

    public void deleteById(Long id) {
        logRepository.deleteById(id);
    }
} 