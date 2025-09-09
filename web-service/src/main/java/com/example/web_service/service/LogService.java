package com.example.web_service.service;

import com.example.web_service.entity.SystemLog;
import com.example.web_service.repository.LogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.time.LocalDateTime;

@Service
public class LogService {
    
    @Autowired
    private LogRepository logRepository;

    public List<SystemLog> findAll() {
    return logRepository.findAllByOrderByDateDesc();
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

    public void info(String user, String module, String content) {
        log("INFO", user, module, content);
    }

    public void warn(String user, String module, String content) {
        log("WARN", user, module, content);
    }

    public void error(String user, String module, String content) {
        log("ERROR", user, module, content);
    }

    public void log(String level, String user, String module, String content) {
        SystemLog entry = new SystemLog();
        entry.setDate(LocalDateTime.now());
        entry.setLevel(level);
        entry.setUser(user == null ? "system" : user);
        entry.setModule(module);
        entry.setContent(content);
        save(entry);
    }
} 