package com.example.web_service.repository;

import com.example.web_service.entity.AlarmSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlarmSettingRepository extends JpaRepository<AlarmSetting, Long> {
} 