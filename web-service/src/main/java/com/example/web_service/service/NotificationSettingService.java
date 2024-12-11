package com.example.web_service.service;

import com.example.web_service.entity.NotificationSetting;
import com.example.web_service.repository.NotificationSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class NotificationSettingService {
    
    @Autowired
    private NotificationSettingRepository notificationSettingRepository;

    public List<NotificationSetting> findAll() {
        return notificationSettingRepository.findAll();
    }

    public NotificationSetting findById(Long id) {
        return notificationSettingRepository.findById(id).orElse(null);
    }

    public NotificationSetting save(NotificationSetting notificationSetting) {
        return notificationSettingRepository.save(notificationSetting);
    }

    public void deleteById(Long id) {
        notificationSettingRepository.deleteById(id);
    }

    public List<NotificationSetting> search(String keyword) {
        return notificationSettingRepository.search(keyword);
    }
} 