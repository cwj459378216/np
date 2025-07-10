package com.example.web_service.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.web_service.service.LogService;
import com.example.web_service.entity.SystemLog;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@RestController
@RequestMapping("/logs")
@Tag(name = "日志管理", description = "系统日志的增删改查操作")
@CrossOrigin(origins = "*")
public class LogController {

    @Autowired
    private LogService logService;

    @GetMapping
    @Operation(summary = "获取所有日志", description = "获取系统中所有的日志记录")
    public List<SystemLog> getAllLogs() {
        return logService.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取单个日志", description = "根据ID获取特定的日志记录")
    public SystemLog getLogById(@PathVariable Long id) {
        return logService.findById(id);
    }

    @PostMapping
    @Operation(summary = "创建日志", description = "创���新的日志记录")
    public SystemLog createLog(@RequestBody SystemLog systemLog) {
        return logService.save(systemLog);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新日志", description = "更新已存在的日志记录")
    public SystemLog updateLog(@PathVariable Long id, @RequestBody SystemLog systemLog) {
        systemLog.setId(id);
        return logService.save(systemLog);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除日志", description = "删除指定的日志记录")
    public void deleteLog(@PathVariable Long id) {
        logService.deleteById(id);
    }
} 