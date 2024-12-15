package com.example.web_service.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "rules")
public class Rule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String sid;
    private String protocol;
    
    @Column(name = "source_address")
    private String sourceAddress;
    
    @Column(name = "source_port")
    private String sourcePort;
    
    @Column(name = "destination_address")
    private String destinationAddress;
    
    @Column(name = "destination_port")
    private String destinationPort;
    
    @Column(name = "class_type")
    private String classType;
    
    private String cve;
    private String reference;
} 