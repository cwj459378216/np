package com.example.web_service.entity;

import lombok.Data;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "local_rules")
public class LocalRule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_content", nullable = false)
    private String ruleContent;

    @Column(name = "created_date", nullable = false)
    private LocalDate createdDate;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String category;

    @Column(name = "last_updated", nullable = false)
    private LocalDateTime lastUpdated;
} 