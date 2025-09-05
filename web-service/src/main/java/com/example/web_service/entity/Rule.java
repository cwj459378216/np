package com.example.web_service.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "suricata_rules")
public class Rule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // New schema mapping for suricata_rules
    private Integer sid;                 // unique in DB
    private String protocol;            // TEXT

    private String direction;           // TEXT, e.g., "->" or "<->"

    @Column(name = "src_port")
    private String srcPort;             // TEXT

    @Column(name = "dst_port")
    private String dstPort;             // TEXT

    private String msg;                 // TEXT

    @Column(name = "classtype")
    private String classType;           // TEXT

    private Integer priority;           // INTEGER

    private String cve;                 // TEXT

    @Column(name = "rule")
    private String rule;                // TEXT (full snort rule)

    private String filename;            // TEXT

    @Column(name = "last_update")
    private java.time.LocalDateTime lastUpdate; // TIMESTAMP
} 