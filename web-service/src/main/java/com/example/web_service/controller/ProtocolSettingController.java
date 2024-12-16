package com.example.web_service.controller;

import com.example.web_service.entity.ProtocolSetting;
import com.example.web_service.repository.ProtocolSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/protocol-settings")
public class ProtocolSettingController {

    @Autowired
    private ProtocolSettingRepository repository;

    @GetMapping
    public List<ProtocolSetting> getAllSettings() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProtocolSetting> getSettingById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ProtocolSetting createSetting(@RequestBody ProtocolSetting setting) {
        setting.setCreatedAt(LocalDateTime.now());
        setting.setUpdatedAt(LocalDateTime.now());
        return repository.save(setting);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProtocolSetting> updateSetting(@PathVariable Long id, @RequestBody ProtocolSetting setting) {
        return repository.findById(id)
                .map(existingSetting -> {
                    setting.setId(id);
                    setting.setUpdatedAt(LocalDateTime.now());
                    setting.setCreatedAt(existingSetting.getCreatedAt());
                    return ResponseEntity.ok(repository.save(setting));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSetting(@PathVariable Long id) {
        return repository.findById(id)
                .map(setting -> {
                    repository.delete(setting);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
} 