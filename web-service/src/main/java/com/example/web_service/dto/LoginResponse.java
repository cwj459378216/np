package com.example.web_service.dto;

import com.example.web_service.entity.User;
import lombok.Data;

@Data
public class LoginResponse {
    private String token;
    private User user;
} 