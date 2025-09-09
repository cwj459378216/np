package com.example.web_service.entity;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonFormat;

@Entity
@Table(name = "collectors")
@Data
public class Collector {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    
    @Column(name = "creation_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime creationTime;
    
    private String interfaceName;
    private String storageStrategy;
    private String filterStrategy;
    private Boolean protocolAnalysisEnabled;
    private Boolean idsEnabled;
    private String status;
    // 手动文件模式下，保存已上传的文件路径
    private String filePath;
    
    @Column(name = "session_id")
    private String sessionId;

    @PrePersist
    protected void onCreate() {
        creationTime = LocalDateTime.now();
    }
} 