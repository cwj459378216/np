package com.example.web_service.controller;

import com.example.web_service.entity.NotificationSetting;
import com.example.web_service.service.NotificationSettingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "通知设置", description = "通知设置的增删改查操作")
@CrossOrigin(origins = "*")
public class NotificationSettingController {

    @Autowired
    private NotificationSettingService notificationSettingService;

    @GetMapping
    @Operation(summary = "获取所有设置", description = "获取所有通知设置")
    public List<NotificationSetting> getAllSettings() {
        return notificationSettingService.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取单个设置", description = "根据ID获取特定的通知设置")
    public NotificationSetting getSettingById(@PathVariable Long id) {
        return notificationSettingService.findById(id);
    }

    @PostMapping
    @Operation(summary = "创建设置", description = "创建新的通知设置")
    public NotificationSetting createSetting(@RequestBody NotificationSetting notificationSetting) {
        return notificationSettingService.save(notificationSetting);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更��设置", description = "更新已存在的通知设置")
    public NotificationSetting updateSetting(@PathVariable Long id, @RequestBody NotificationSetting notificationSetting) {
        notificationSetting.setId(id);
        return notificationSettingService.save(notificationSetting);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除设置", description = "删除指定的通知设置")
    public void deleteSetting(@PathVariable Long id) {
        notificationSettingService.deleteById(id);
    }

    @GetMapping("/search")
    @Operation(summary = "搜索设置", description = "根据关键字搜索通知设置")
    public List<NotificationSetting> searchSettings(@RequestParam String keyword) {
        return notificationSettingService.search(keyword);
    }

    @PostMapping("/test")
    public ResponseEntity<Boolean> testNotification(@RequestBody NotificationSetting setting) {
        try {
            boolean result = notificationSettingService.testNotification(setting);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(false);
        }
    }
} 