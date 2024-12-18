package com.example.web_service.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.web_service.entity.SystemTime;
import com.example.web_service.repository.SystemTimeRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.transaction.annotation.Transactional;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;

@Service
public class SystemTimeService {
    @Autowired
    private SystemTimeRepository systemTimeRepository;

    public SystemTime getCurrentSettings() {
        SystemTime settings = systemTimeRepository.findFirstByOrderByIdDesc();
        if (settings == null) {
            settings = new SystemTime();
            settings.setTimeSettingMethod("manual");
            settings.setTimeZone("Asia/Shanghai");
            settings.setAutoTimezoneDetection(false);
            settings.setCreatedAt(LocalDateTime.now());
            settings.setUpdatedAt(LocalDateTime.now());
            return systemTimeRepository.save(settings);
        }
        return settings;
    }

    @Transactional
    public SystemTime updateSettings(SystemTime systemTime) throws IOException {
        SystemTime current = getCurrentSettings();
        
        // 更新时区
        if (systemTime.getTimeZone() != null && !systemTime.getTimeZone().equals(current.getTimeZone())) {
            setTimezone(systemTime.getTimeZone());
        }

        // 根据设置方法更新系统时间
        if ("manual".equals(systemTime.getTimeSettingMethod())) {
            if (systemTime.getManualTime() != null) {
                setManualTime(systemTime.getManualTime());
            }
            // 如果是手动模式，停止NTP服务
            executeCommand("sudo systemctl stop systemd-timesyncd");
        } else if ("ntp".equals(systemTime.getTimeSettingMethod())) {
            // 配置NTP服务器
            if (systemTime.getNtpServer() != null) {
                configureNtpServer(systemTime.getNtpServer());
            }
            // 启动NTP服务
            executeCommand("sudo systemctl start systemd-timesyncd");
            executeCommand("sudo systemctl enable systemd-timesyncd");
        }
        
        // 更新数据库记录
        current.setTimeSettingMethod(systemTime.getTimeSettingMethod());
        current.setManualTime(systemTime.getManualTime());
        current.setNtpServer(systemTime.getNtpServer());
        current.setSyncFrequency(systemTime.getSyncFrequency());
        current.setTimeZone(systemTime.getTimeZone());
        current.setAutoTimezoneDetection(systemTime.getAutoTimezoneDetection());
        current.setUpdatedAt(LocalDateTime.now());
        
        return systemTimeRepository.save(current);
    }

    private void setTimezone(String timezone) throws IOException {
        // 设置系统时区
        executeCommand("sudo timedatectl set-timezone " + timezone);
    }

    private void setManualTime(LocalDateTime dateTime) throws IOException {
        // 格式化日期时间字符串
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        String timeStr = dateTime.format(formatter);
        
        // 设置系统时间
        executeCommand("sudo date -s \"" + timeStr + "\"");
        // 将时间写入硬件时钟
        executeCommand("sudo hwclock --systohc");
    }

    private void configureNtpServer(String ntpServer) throws IOException {
        // 备份原配置文件
        executeCommand("sudo cp /etc/systemd/timesyncd.conf /etc/systemd/timesyncd.conf.bak");
        
        // 写入新的NTP服务器配置
        String config = String.format("[Time]\nNTP=%s\nFallbackNTP=ntp.ubuntu.com", ntpServer);
        executeCommand("echo '" + config + "' | sudo tee /etc/systemd/timesyncd.conf");
        
        // 重启时间同步服务
        executeCommand("sudo systemctl restart systemd-timesyncd");
    }

    private String executeCommand(String command) throws IOException {
        Process process = Runtime.getRuntime().exec(new String[]{"bash", "-c", command});
        StringBuilder output = new StringBuilder();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }

        try {
            process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("命令执行被中断: " + command, e);
        }

        if (process.exitValue() != 0) {
            throw new IOException("命令执行失败: " + command);
        }

        return output.toString();
    }
} 