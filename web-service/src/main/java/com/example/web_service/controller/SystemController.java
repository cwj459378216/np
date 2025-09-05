package com.example.web_service.controller;

import com.example.web_service.dto.SystemInfoDto;
import com.example.web_service.service.SystemInfoService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/system")
@CrossOrigin(origins = "*")
public class SystemController {

    @Autowired
    private SystemInfoService systemInfoService;

    /**
     * 获取系统信息
     * @return 系统信息
     */
    @GetMapping("/info")
    public ResponseEntity<SystemInfoDto> getSystemInfo() {
        try {
            log.info("获取系统信息请求");
            SystemInfoDto systemInfo = systemInfoService.getSystemInfo();
            return ResponseEntity.ok(systemInfo);
        } catch (Exception e) {
            log.error("获取系统信息失败", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
