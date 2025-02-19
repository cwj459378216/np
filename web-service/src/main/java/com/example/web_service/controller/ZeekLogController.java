package com.example.web_service.controller;

import com.example.web_service.entity.ZeekLogsConfig;
import com.example.web_service.entity.ZeekLogType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.core.io.ClassPathResource;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;

@Slf4j
@RestController
@RequestMapping("/api/zeek-logs")
public class ZeekLogController {

    private final ObjectMapper yamlMapper;

    public ZeekLogController() {
        this.yamlMapper = new ObjectMapper(new YAMLFactory());
        // 配置 ObjectMapper 以忽略未知属性
        this.yamlMapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    @GetMapping("/config")
    public ResponseEntity<ZeekLogsConfig> getZeekLogsConfig() {
        try {
            ClassPathResource resource = new ClassPathResource("zeek_logs.yml");
            ZeekLogsConfig config = yamlMapper.readValue(resource.getInputStream(), ZeekLogsConfig.class);
            return ResponseEntity.ok(config);
        } catch (IOException e) {
            log.error("Error reading YAML file: ", e);
            return ResponseEntity.internalServerError().build();
        } catch (Exception e) {
            log.error("Error parsing YAML content: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/config/{logName}")
    public ResponseEntity<ZeekLogType> getZeekLogConfigByName(@PathVariable String logName) {
        try {
            ClassPathResource resource = new ClassPathResource("zeek_logs.yml");
            ZeekLogsConfig config = yamlMapper.readValue(resource.getInputStream(), ZeekLogsConfig.class);
            return config.getZeek().stream()
                    .filter(log -> log.getLogName().equals(logName))
                    .findFirst()
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IOException e) {
            log.error("Error reading YAML file: ", e);
            return ResponseEntity.internalServerError().build();
        } catch (Exception e) {
            log.error("Error parsing YAML content: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }
} 