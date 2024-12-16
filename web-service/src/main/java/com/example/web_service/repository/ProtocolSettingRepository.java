package com.example.web_service.repository;

import com.example.web_service.entity.ProtocolSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProtocolSettingRepository extends JpaRepository<ProtocolSetting, Long> {
} 