package com.example.web_service.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.web_service.service.AgingService;
import com.example.web_service.service.AgingScheduleService;
import com.example.web_service.service.EsDeletionTaskService;
import com.example.web_service.entity.AgingSchedule;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/aging")
@Tag(name = "老化管理接口", description = "用于数据老化和删除管理")
public class AgingController {

    @Autowired
    private AgingService agingService;
    
    @Autowired
    private EsDeletionTaskService esDeletionTaskService;
    
    @Autowired
    private AgingScheduleService agingScheduleService;

    // 用于接收手动删除请求（支持多个 sessionIds 与 before 时间）
    public static class ManualAgingRequest {
        private List<String> sessionIds; // 基于 filePath 的会话ID集合
        private Long before;             // 毫秒时间戳：删除该时间之前的数据
        // 为兼容旧版，保留单个 sessionId 字段
        private String sessionId;

        public List<String> getSessionIds() { return sessionIds; }
        public void setSessionIds(List<String> sessionIds) { this.sessionIds = sessionIds; }
        public Long getBefore() { return before; }
        public void setBefore(Long before) { this.before = before; }
        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    }

    @PostMapping("/execute")
    @Operation(summary = "手动执行老化删除", description = "根据会话ID或filePath并结合时间条件手动执行数据删除")
    public Map<String, String> executeManualAging(@RequestBody ManualAgingRequest request) {
        // 新版：传 sessionIds + before（根据 filePath 删除，并限制时间）
        if (request.getSessionIds() != null && !request.getSessionIds().isEmpty()) {
            String taskId = agingService.executeManualAgingByFilePaths(request.getSessionIds(), request.getBefore());
            return Map.of("taskId", taskId);
        }
        // 兼容：旧版只传单个 sessionId
        if (request.getSessionId() != null && !request.getSessionId().isBlank()) {
            String taskId = agingService.executeManualAging(request.getSessionId());
            return Map.of("taskId", taskId);
        }
        throw new IllegalArgumentException("sessionIds or sessionId is required");
    }

    @GetMapping("/status/{taskId}")
    @Operation(summary = "查询老化任务状态", description = "根据任务ID查询老化任务的执行状态")
    public EsDeletionTaskService.TaskStatus getTaskStatus(@PathVariable String taskId) {
        return esDeletionTaskService.getStatus(taskId);
    }

    @PostMapping("/schedule")
    @Operation(summary = "保存自动删除计划", description = "配置自动删除的计划设置")
    public Map<String, String> saveSchedule(@RequestBody AgingSchedule schedule) {
        agingService.saveSchedule(schedule);
        return Map.of("message", "Schedule saved successfully");
    }

    @GetMapping("/schedule")
    @Operation(summary = "获取自动删除计划", description = "获取当前配置的自动删除计划")
    public AgingSchedule getSchedule() {
        return agingService.getSchedule();
    }

    @PostMapping("/execute-auto")
    @Operation(summary = "手动执行自动老化", description = "手动触发针对ens33接口的自动老化删除")
    public Map<String, String> executeAutoAging() {
        String taskId = agingService.executeAutoAging();
        if (taskId != null) {
            return Map.of("taskId", taskId, "message", "Auto aging task started successfully");
        } else {
            return Map.of("message", "Auto aging is disabled or no data to process");
        }
    }
    
    @PostMapping("/trigger")
    @Operation(summary = "手动触发老化任务", description = "通过调度服务手动触发老化任务")
    public Map<String, String> triggerAging() {
        String taskId = agingScheduleService.triggerManualAging();
        if (taskId != null) {
            return Map.of("taskId", taskId, "message", "Manual aging triggered successfully");
        } else {
            return Map.of("message", "Aging is disabled or no data to process");
        }
    }
}
