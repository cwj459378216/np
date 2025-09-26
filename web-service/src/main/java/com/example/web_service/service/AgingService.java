package com.example.web_service.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.example.web_service.entity.AgingSchedule;
import com.example.web_service.repository.AgingScheduleRepository;
import com.example.web_service.repository.CollectorRepository;

import java.util.List;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.stream.Collectors;

@Service
public class AgingService {
    private static final Logger log = LoggerFactory.getLogger(AgingService.class);

    @Autowired
    private EsDeletionTaskService esDeletionTaskService;

    @Autowired
    private LogService logService;
    
    @Autowired
    private AgingScheduleRepository agingScheduleRepository;
    
    @Autowired
    private CollectorRepository collectorRepository;

    /**
     * 执行手动老化删除
     * @param sessionId 会话ID
     * @return 任务ID
     */
    public String executeManualAging(String sessionId) {
        log.info("Starting manual aging for sessionId: {}", sessionId);
        logService.info("system", "Aging", "Manual aging started for sessionId: " + sessionId);
        
        return esDeletionTaskService.startDeletionBySessionId(sessionId);
    }

    /**
     * 执行手动老化删除（根据 filePath 列表与时间条件）
     * @param sessionIds 作为 filePath 关键字的一组会话ID
     * @param beforeMillis 删除该时间之前的数据（毫秒时间戳，可为空，为空则不加时间限制）
     * @return 任务ID
     */
    public String executeManualAgingByFilePaths(List<String> sessionIds, Long beforeMillis) {
        log.info("Starting manual aging by filePaths: count={}, before={}", 
                (sessionIds == null ? 0 : sessionIds.size()), beforeMillis);
        logService.info("system", "Aging", "Manual aging by filePaths started: " + 
                (sessionIds == null ? 0 : sessionIds.size()) + ", before=" + beforeMillis);
        return esDeletionTaskService.startDeletionByFilePathsBefore(sessionIds, beforeMillis);
    }

    /**
     * 保存自动删除计划
     */
    public void saveSchedule(AgingSchedule schedule) {
        // 获取现有配置或创建新配置
        AgingSchedule existingSchedule = agingScheduleRepository.findFirstByOrderByIdAsc();
        if (existingSchedule != null) {
            // 更新现有配置
            existingSchedule.setEnabled(schedule.getEnabled());
            existingSchedule.setScheduleType(schedule.getScheduleType());
            existingSchedule.setExecutionTime(schedule.getExecutionTime());
            existingSchedule.setRetentionDays(schedule.getRetentionDays());
            agingScheduleRepository.save(existingSchedule);
        } else {
            // 创建新配置
            agingScheduleRepository.save(schedule);
        }
        
        log.info("Aging schedule saved: enabled={}, schedule={}, time={}, retentionDays={}", 
                schedule.getEnabled(), schedule.getScheduleType(), schedule.getExecutionTime(), schedule.getRetentionDays());
        logService.info("system", "Aging", 
                String.format("Schedule updated: %s %s, retention: %d days", 
                        schedule.getScheduleType(), schedule.getExecutionTime(), schedule.getRetentionDays()));
    }

    /**
     * 获取当前的删除计划配置
     */
    public AgingSchedule getSchedule() {
        AgingSchedule schedule = agingScheduleRepository.findFirstByOrderByIdAsc();
        if (schedule == null) {
            // 如果没有配置，返回默认配置
            schedule = new AgingSchedule();
            schedule.setEnabled(false);
            schedule.setScheduleType("daily");
            schedule.setExecutionTime("02:00");
            schedule.setRetentionDays(30);
        }
        return schedule;
    }

    /**
     * 执行自动老化删除 - 针对interfaceName="ens33"的collector数据
     * 该方法会查询所有interfaceName="ens33"的collector的sessionId，
     * 然后删除ES中filePath匹配这些sessionId且超过保留天数的数据
     */
    public String executeAutoAging() {
        AgingSchedule schedule = getSchedule();
        if (!schedule.getEnabled()) {
            log.info("Auto aging is disabled, skipping execution");
            return null;
        }

        log.info("Starting auto aging execution for interface ens33, retentionDays: {}", schedule.getRetentionDays());
        logService.info("system", "Aging", "Auto aging started for interface ens33, retention: " + schedule.getRetentionDays() + " days");
        
        try {
            // 1. 查询所有interfaceName="ens33"的collector的sessionId
            List<String> sessionIds = collectorRepository.findSessionIdsByInterfaceName("ens33");
            
            if (sessionIds.isEmpty()) {
                log.info("No sessionIds found for interface ens33, nothing to delete");
                logService.info("system", "Aging", "No sessionIds found for interface ens33");
                return null;
            }
            
            log.info("Found {} sessionIds for interface ens33: {}", sessionIds.size(), sessionIds);
            
            // 2. 计算截止时间（当前时间 - 保留天数）
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(schedule.getRetentionDays());
            long beforeMillis = cutoffDate.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
            
            log.info("Auto aging cutoff time: {} ({}ms)", cutoffDate, beforeMillis);
            
            // 3. 启动异步删除任务，删除filePath匹配sessionId且时间早于截止时间的数据
            String taskId = esDeletionTaskService.startDeletionByFilePathsBefore(sessionIds, beforeMillis);
            
            logService.info("system", "Aging", 
                String.format("Auto aging task started: taskId=%s, sessionIds count=%d, before=%s", 
                    taskId, sessionIds.size(), cutoffDate));
            
            return taskId;
            
        } catch (Exception e) {
            log.error("Auto aging execution failed", e);
            logService.error("system", "Aging", "Auto aging execution failed: " + e.getMessage());
            throw e;
        }
    }

    /**
     * 检查是否应该执行自动老化（用于定时任务判断）
     */
    public boolean shouldExecuteAutoAging() {
        AgingSchedule schedule = getSchedule();
        return schedule.getEnabled();
    }

    /**
     * 获取EsDeletionTaskService实例（用于Controller访问任务状态）
     */
    public EsDeletionTaskService getEsDeletionTaskService() {
        return esDeletionTaskService;
    }
}
