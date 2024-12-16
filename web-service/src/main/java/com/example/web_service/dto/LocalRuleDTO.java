package com.example.web_service.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class LocalRuleDTO {
    private Long id;
    private String rule_content;
    private String created_date;
    private String status;
    private String category;
    private String last_updated;
} 