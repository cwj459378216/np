package com.example.web_service.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.example.web_service.entity.AgingSchedule;

import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * 自动老化定时任务服务
 * 负责根据AgingSchedule配置定时执行数据老化删除
 */
@Service
public class AgingScheduleService {
    private static final Logger log = LoggerFactory.getLogger(AgingScheduleService.class);
    
    @Autowired
    private AgingService agingService;
    
    @Autowired
    private LogService logService;
    
    // 上次执行时间记录，避免重复执行
    private LocalDateTime lastExecutionTime = null;
    
    /**
     * 定时检查并执行老化任务
     * 每1分钟检查一次是否需要执行老化删除
     */
    @Scheduled(fixedRate = 60000) // 1分钟 = 60,000毫秒
    public void checkAndExecuteAging() {
        try {
            if (!agingService.shouldExecuteAutoAging()) {
                return; // 自动老化未启用
            }
            
            AgingSchedule schedule = agingService.getSchedule();
            LocalDateTime now = LocalDateTime.now();
            
            // 检查是否到了执行时间
            if (shouldExecuteNow(schedule, now)) {
                log.info("Auto aging execution time reached, starting aging process");
                logService.info("system", "AgingSchedule", "Auto aging execution started");
                
                String taskId = agingService.executeAutoAging();
                if (taskId != null) {
                    log.info("Auto aging task started successfully, taskId: {}", taskId);
                    logService.info("system", "AgingSchedule", "Auto aging task started: " + taskId);
                } else {
                    log.info("Auto aging task not started (disabled or no data)");
                }
                
                // 更新最后执行时间
                lastExecutionTime = now.withSecond(0).withNano(0); // 精确到分钟
            }
            
        } catch (Exception e) {
            log.error("Error in aging schedule check", e);
            logService.error("system", "AgingSchedule", "Aging schedule check failed: " + e.getMessage());
        }
    }
    
    /**
     * 判断当前是否应该执行老化任务
     */
    private boolean shouldExecuteNow(AgingSchedule schedule, LocalDateTime now) {
        try {
            // 解析执行时间 (格式: HH:mm)
            LocalTime executionTime = LocalTime.parse(schedule.getExecutionTime(), DateTimeFormatter.ofPattern("HH:mm"));
            LocalDateTime scheduledDateTime = now.toLocalDate().atTime(executionTime);
            
            // 当前时间的分钟级精度
            LocalDateTime currentMinute = now.withSecond(0).withNano(0);
            LocalDateTime scheduledMinute = scheduledDateTime.withSecond(0).withNano(0);
            
            // 检查是否是执行时间点
            boolean isExecutionTime = currentMinute.equals(scheduledMinute);
            
            // 检查是否已经在这个时间点执行过了
            boolean alreadyExecuted = lastExecutionTime != null && lastExecutionTime.equals(currentMinute);
            
            // 根据调度类型进行额外检查
            boolean scheduleTypeMatches = checkScheduleType(schedule.getScheduleType(), now);
            
            log.debug("Aging schedule check: executionTime={}, current={}, isExecutionTime={}, alreadyExecuted={}, scheduleTypeMatches={}", 
                    scheduledMinute, currentMinute, isExecutionTime, alreadyExecuted, scheduleTypeMatches);
            
            return isExecutionTime && !alreadyExecuted && scheduleTypeMatches;
            
        } catch (DateTimeParseException e) {
            log.error("Invalid execution time format: {}, expected HH:mm", schedule.getExecutionTime(), e);
            return false;
        }
    }
    
    /**
     * 检查调度类型是否匹配当前时间
     */
    private boolean checkScheduleType(String scheduleType, LocalDateTime now) {
        switch (scheduleType.toLowerCase()) {
            case "daily":
                return true; // 每天都可以执行
                
            case "weekly":
                // 每周一执行 (1 = Monday)
                return now.getDayOfWeek().getValue() == 1;
                
            case "monthly":
                // 每月1号执行
                return now.getDayOfMonth() == 1;
                
            default:
                log.warn("Unknown schedule type: {}, treating as daily", scheduleType);
                return true;
        }
    }
    
    /**
     * 手动触发老化任务（用于测试或管理员操作）
     */
    public String triggerManualAging() {
        log.info("Manual aging trigger requested");
        logService.info("system", "AgingSchedule", "Manual aging trigger requested");
        
        try {
            String taskId = agingService.executeAutoAging();
            if (taskId != null) {
                log.info("Manual aging task started successfully, taskId: {}", taskId);
                logService.info("system", "AgingSchedule", "Manual aging task started: " + taskId);
            } else {
                log.info("Manual aging task not started (disabled or no data)");
                logService.info("system", "AgingSchedule", "Manual aging task not started (disabled or no data)");
            }
            return taskId;
        } catch (Exception e) {
            log.error("Manual aging trigger failed", e);
            logService.error("system", "AgingSchedule", "Manual aging trigger failed: " + e.getMessage());
            throw e;
        }
    }
}