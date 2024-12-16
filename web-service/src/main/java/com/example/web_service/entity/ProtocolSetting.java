package com.example.web_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "protocol_settings")
@Data
public class ProtocolSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "protocol_name")
    private String protocolName;

    private Integer port;
    private String description;
    
    @Column(name = "is_enabled")
    private Boolean isEnabled;
    
    @Column(name = "importance_level")
    private String importanceLevel;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
} 