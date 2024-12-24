package com.example.web_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
@Entity
@Table(name = "notification_settings")
public class NotificationSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String service;

    @Column(name = "mail_server")
    private String mailServer;

    private String security;

    @Column(name = "email_port")
    private String emailPort;

    @Column(name = "account_name")
    private String accountName;

    private String password;

    private String sender;

    private String receiver;

    private String subject;

    private String host;

    @Column(name = "syslog_port")
    private String syslogPort;

    @Column(name = "created_at")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
} 