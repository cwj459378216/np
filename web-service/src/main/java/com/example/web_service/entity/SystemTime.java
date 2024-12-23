package com.example.web_service.entity;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;

@Entity
@Table(name = "system_time_settings")
@Data
public class SystemTime {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "time_setting_method")
    private String timeSettingMethod;

    @Column(name = "manual_time")
    @JsonDeserialize(using = LocalDateTimeDeserializer.class)
    private LocalDateTime manualTime;

    @Column(name = "ntp_server")
    private String ntpServer;

    @Column(name = "time_zone")
    private String timeZone;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
} 