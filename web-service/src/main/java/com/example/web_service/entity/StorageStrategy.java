package com.example.web_service.entity;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonFormat;

@Entity
@Table(name = "storage_strategies")
@Data
public class StorageStrategy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    
    @Column(name = "creation_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime creationTime;
    
    private String fileSize;
    private Integer fileCount;
    private String outOfDiskAction;
    private String fileType;
    private String triggerType;
    private String timeRange;
    private String alarmType;
    private Integer duration;

    @PrePersist
    protected void onCreate() {
        creationTime = LocalDateTime.now();
    }
} 