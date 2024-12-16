package com.example.web_service.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/test")
@Tag(name = "测试接口", description = "用于测试的API接口")
public class TestController {

    @GetMapping("/hello")
    @Operation(summary = "测试接口", description = "返回一个简单的问候消息")
    public String hello() {
        return "Hello, Swagger!";
    }
} 