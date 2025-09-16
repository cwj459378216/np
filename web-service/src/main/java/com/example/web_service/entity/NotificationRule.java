package com.example.web_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;
import org.hibernate.annotations.Type;
import com.vladmihalcea.hibernate.type.json.JsonBinaryType;

@Data
@Entity
@Table(name = "notification_rules")
public class NotificationRule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_name", nullable = false)
    private String ruleName;

    private String description;

    @Column(name = "time_window", nullable = false)
    private String timeWindow;

    @Column(name = "trigger_condition", nullable = false)
    private String triggerCondition;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private Object filters;

    @Column(name = "notification_setting_id", nullable = false)
    private Long notificationSettingId;

    private String status;

    @Column(name = "created_at")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
} 