package com.example.web_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
@Entity
@Table(name = "network_interfaces")
public class NetworkInterface {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "interface_name")
    private String interface_name;

    @Column(nullable = false)
    private String method;

    @Column(name = "ip_address")
    private String ip_address;

    @Column
    private String netmask;

    @Column
    private String gateway;

    @Column(name = "created_at")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime created_at;

    @PrePersist
    protected void onCreate() {
        created_at = LocalDateTime.now();
    }
} 