package com.example.web_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 文件清理配置属性
 */
@Component
@ConfigurationProperties(prefix = "app.file-cleanup")
public class FileCleanupProperties {
    
    /**
     * 上传目录路径
     */
    private String uploadDir = "/datastore/pcap/upload/";
    
    /**
     * 文件保留时间（小时）
     */
    private int retentionHours = 24;
    
    /**
     * 清理任务执行间隔（毫秒）
     */
    private long cleanupInterval = 3600000; // 1小时
    
    /**
     * 是否启用自动清理
     */
    private boolean enabled = true;
    
    public String getUploadDir() {
        return uploadDir;
    }
    
    public void setUploadDir(String uploadDir) {
        this.uploadDir = uploadDir;
    }
    
    public int getRetentionHours() {
        return retentionHours;
    }
    
    public void setRetentionHours(int retentionHours) {
        this.retentionHours = retentionHours;
    }
    
    public long getCleanupInterval() {
        return cleanupInterval;
    }
    
    public void setCleanupInterval(long cleanupInterval) {
        this.cleanupInterval = cleanupInterval;
    }
    
    public boolean isEnabled() {
        return enabled;
    }
    
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}