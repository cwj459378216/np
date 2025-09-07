package com.example.web_service.controller;

import com.example.web_service.entity.ReportScheduler;
import com.example.web_service.service.ReportSchedulerService;
import com.example.web_service.service.ReportScheduleExecutorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RestController
@RequestMapping("/report-schedulers")
@Tag(name = "报告调度器", description = "报告调度器的增删改查操作")
@CrossOrigin(origins = "*")
public class ReportSchedulerController {

    private static final Logger logger = LoggerFactory.getLogger(ReportSchedulerController.class);

    @Autowired
    private ReportSchedulerService reportSchedulerService;
    
    @Autowired
    private ReportScheduleExecutorService reportScheduleExecutorService;

    @GetMapping(produces = "application/json;charset=UTF-8")
    @Operation(summary = "获取所有调度器")
    public List<ReportScheduler> getAllSchedulers() {
        return reportSchedulerService.findAll();
    }

    @GetMapping(value = "/{id}", produces = "application/json;charset=UTF-8")
    @Operation(summary = "获取单个调度器")
    public ReportScheduler getScheduler(@PathVariable Long id) {
        return reportSchedulerService.findById(id);
    }

    @PostMapping(produces = "application/json;charset=UTF-8")
    @Operation(summary = "创建调度器")
    public ReportScheduler createScheduler(@RequestBody ReportScheduler scheduler) {
        System.out.println("Received scheduler data: " + scheduler);
        try {
            return reportSchedulerService.save(scheduler);
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    @PutMapping(value = "/{id}", produces = "application/json;charset=UTF-8")
    @Operation(summary = "更新调度器")
    public ReportScheduler updateScheduler(@PathVariable Long id, @RequestBody ReportScheduler scheduler) {
        try {
            logger.info("Updating scheduler with ID: {}", id);
            logger.info("Received scheduler data: {}", scheduler);
            
            scheduler.setId(id);
            ReportScheduler result = reportSchedulerService.save(scheduler);
            
            logger.info("Updated scheduler successfully: {}", result);
            return result;
        } catch (Exception e) {
            logger.error("Error updating scheduler with ID: {}", id, e);
            throw e;
        }
    }

    @DeleteMapping(value = "/{id}", produces = "application/json;charset=UTF-8")
    @Operation(summary = "删除调度器")
    public void deleteScheduler(@PathVariable Long id) {
        reportSchedulerService.deleteById(id);
    }
    
    @PostMapping(value = "/{id}/execute", produces = "application/json;charset=UTF-8")
    @Operation(summary = "手动执行调度器")
    public ResponseEntity<String> executeScheduler(@PathVariable Long id) {
        try {
            ReportScheduler scheduler = reportSchedulerService.findById(id);
            if (scheduler == null) {
                return ResponseEntity.notFound().build();
            }
            
            // 手动执行调度器
            reportScheduleExecutorService.executeSchedulerManually(scheduler);
            return ResponseEntity.ok("调度器执行成功");
        } catch (Exception e) {
            logger.error("Error executing scheduler with ID: {}", id, e);
            return ResponseEntity.internalServerError().body("执行失败: " + e.getMessage());
        }
    }
} 