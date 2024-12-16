package com.example.web_service.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.web_service.entity.SystemTime;
import com.example.web_service.service.SystemTimeService;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/system-time")
@CrossOrigin(origins = "*")
public class SystemTimeController {
    @Autowired
    private SystemTimeService systemTimeService;

    @GetMapping
    public ResponseEntity<?> getSettings() {
        try {
            SystemTime settings = systemTimeService.getCurrentSettings();
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error fetching system time settings: " + e.getMessage());
        }
    }

    @PutMapping
    public ResponseEntity<?> updateSettings(@RequestBody SystemTime systemTime) {
        try {
            SystemTime updated = systemTimeService.updateSettings(systemTime);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error updating system time settings: " + e.getMessage());
        }
    }
} 