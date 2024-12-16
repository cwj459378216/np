package com.example.web_service.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.web_service.entity.SystemTime;
import com.example.web_service.repository.SystemTimeRepository;
import java.time.LocalDateTime;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemTimeService {
    @Autowired
    private SystemTimeRepository systemTimeRepository;

    public SystemTime getCurrentSettings() {
        SystemTime settings = systemTimeRepository.findFirstByOrderByIdDesc();
        if (settings == null) {
            // 如果没有设置,创建默认设置
            settings = new SystemTime();
            settings.setTimeSettingMethod("manual");
            settings.setTimeZone("GMT+8");
            settings.setAutoTimezoneDetection(false);
            settings.setCreatedAt(LocalDateTime.now());
            settings.setUpdatedAt(LocalDateTime.now());
            return systemTimeRepository.save(settings);
        }
        return settings;
    }

    @Transactional
    public SystemTime updateSettings(SystemTime systemTime) {
        SystemTime current = getCurrentSettings();
        
        // 更新现有记录而不是创建新记录
        current.setTimeSettingMethod(systemTime.getTimeSettingMethod());
        current.setManualTime(systemTime.getManualTime());
        current.setNtpServer(systemTime.getNtpServer());
        current.setSyncFrequency(systemTime.getSyncFrequency());
        current.setTimeZone(systemTime.getTimeZone());
        current.setAutoTimezoneDetection(systemTime.getAutoTimezoneDetection());
        current.setUpdatedAt(LocalDateTime.now());
        
        return systemTimeRepository.save(current);
    }
} 