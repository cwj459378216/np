package com.example.web_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonSetter;

@Data
@Entity
@Table(name = "report_schedulers")
public class ReportScheduler {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String template;


    @Column(nullable = false)
    private String frequency;

    @Column(name = "schedule_time", nullable = false)
    @JsonFormat(pattern = "HH:mm")
    private LocalTime time;

    // 自定义setter方法来处理不同的时间格式
    @JsonSetter("time")
    public void setTimeFromString(String timeStr) {
        if (timeStr != null && !timeStr.isEmpty()) {
            try {
                // 处理 HH:mm 格式
                if (timeStr.matches("\\d{2}:\\d{2}")) {
                    this.time = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
                }
                // 处理 HH:mm:ss 格式
                else if (timeStr.matches("\\d{2}:\\d{2}:\\d{2}")) {
                    this.time = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm:ss"));
                }
                // 其他格式尝试默认解析
                else {
                    this.time = LocalTime.parse(timeStr);
                }
            } catch (Exception e) {
                // 如果解析失败，尝试直接设置
                try {
                    this.time = LocalTime.parse(timeStr);
                } catch (Exception ex) {
                    throw new IllegalArgumentException("Invalid time format: " + timeStr, ex);
                }
            }
        }
    }

    // 标准的setter方法
    public void setTime(LocalTime time) {
        this.time = time;
    }

    @Column(name = "where_to_send", nullable = false)
    private String whereToSend;

    @Column(nullable = false)
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