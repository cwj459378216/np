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
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

@Service
public class SystemTimeService {
    private static final String TIMEDATECTL = "timedatectl";
    private static final String SYSTEMCTL = "systemctl";
    private static final String DATE = "date";
    private static final String HWCLOCK = "hwclock";

    @Autowired
    private SystemTimeRepository systemTimeRepository;

    public SystemTime getCurrentSettings() {
        SystemTime settings = systemTimeRepository.findFirstByOrderByIdDesc();
        if (settings == null) {
            settings = new SystemTime();
            settings.setTimeSettingMethod("manual");
            settings.setTimeZone("Asia/Shanghai");
            settings.setCreatedAt(LocalDateTime.now());
            settings.setUpdatedAt(LocalDateTime.now());
            return systemTimeRepository.save(settings);
        }
        return settings;
    }

    @Transactional
    public SystemTime updateSettings(SystemTime systemTime) throws IOException {
        try {
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
                executeCommand(new String[]{SYSTEMCTL, "stop", "systemd-timesyncd"});
            } else if ("ntp".equals(systemTime.getTimeSettingMethod())) {
                if (systemTime.getNtpServer() != null) {
                    configureNtpServer(systemTime.getNtpServer());
                }
                executeCommand(new String[]{SYSTEMCTL, "start", "systemd-timesyncd"});
                executeCommand(new String[]{SYSTEMCTL, "enable", "systemd-timesyncd"});
            }
            
            // 更新数据库记录
            current.setTimeSettingMethod(systemTime.getTimeSettingMethod());
            current.setManualTime(systemTime.getManualTime());
            current.setNtpServer(systemTime.getNtpServer());
            current.setSyncFrequency(systemTime.getSyncFrequency());
            current.setTimeZone(systemTime.getTimeZone());
            current.setUpdatedAt(LocalDateTime.now());
            
            return systemTimeRepository.save(current);
        } catch (Exception e) {
            throw new IOException("更新系统时间设置失败: " + e.getMessage(), e);
        }
    }

    private void setTimezone(String timezone) throws IOException {
        try {
            executeCommand(new String[]{TIMEDATECTL, "set-timezone", timezone});
        } catch (IOException e) {
            throw new IOException("设置时区失败: " + e.getMessage(), e);
        }
    }

    private void setManualTime(LocalDateTime dateTime) throws IOException {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            String timeStr = dateTime.format(formatter);
            executeCommand(new String[]{DATE, "-s", timeStr});
            executeCommand(new String[]{HWCLOCK, "--systohc"});
        } catch (IOException e) {
            throw new IOException("设置系统时间失败: " + e.getMessage(), e);
        }
    }

    private void configureNtpServer(String ntpServer) throws IOException {
        try {
            executeCommand(new String[]{SYSTEMCTL, "stop", "systemd-timesyncd"});
            
            String configPath = "/etc/systemd/timesyncd.conf";
            String config = String.format("[Time]\nNTP=%s\nFallbackNTP=ntp.ubuntu.com", ntpServer);
            
            Files.write(Paths.get(configPath), config.getBytes(), 
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            
            executeCommand(new String[]{SYSTEMCTL, "restart", "systemd-timesyncd"});
        } catch (IOException e) {
            throw new IOException("配置NTP服务器失败: " + e.getMessage(), e);
        }
    }

    private String executeCommand(String[] command) throws IOException {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(command);
            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();
            
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new IOException("命令执行失败，退出码: " + exitCode + "\n输出: " + output.toString());
            }

            return output.toString();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("命令执行被中断", e);
        }
    }
} 