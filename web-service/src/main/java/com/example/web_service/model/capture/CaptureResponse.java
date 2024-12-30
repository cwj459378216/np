package com.example.web_service.model.capture;

import lombok.Data;

@Data
public class CaptureResponse {
    private Integer error;
    private String message;
    private String status;
    private String uuid;
    private String options;
} 