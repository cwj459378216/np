package com.example.web_service.dto;

import lombok.Data;

@Data
public class RuleUpdateConfigDTO {
    private String updateMode;
    private String updateUrl;
    private Integer updateInterval;
    private String username;
    private String password;
} 