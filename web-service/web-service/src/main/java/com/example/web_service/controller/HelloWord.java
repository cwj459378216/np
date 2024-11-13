package com.example.web_service.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "测试Controller", description = "这是描述")
public class HelloWord {
    @GetMapping
    @RequestMapping(value = "/", produces="application/json;charset=UTF-8")
    public String hello() {
        return "JIM api service...";
    }

    @GetMapping("/hello")
    @Operation(summary = "Say hello", description = "This API returns a simple hello message")
    public String sayHello() {
        return "Hello, World!";
    }
}
