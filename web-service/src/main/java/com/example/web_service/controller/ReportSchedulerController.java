package com.example.web_service.controller;

import com.example.web_service.entity.ReportScheduler;
import com.example.web_service.service.ReportSchedulerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController
@RequestMapping("/api/report-schedulers")
@Tag(name = "报告调度器", description = "报告调度器的增删改查操作")
@CrossOrigin(origins = "*")
public class ReportSchedulerController {

    @Autowired
    private ReportSchedulerService reportSchedulerService;

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
        scheduler.setId(id);
        return reportSchedulerService.save(scheduler);
    }

    @DeleteMapping(value = "/{id}", produces = "application/json;charset=UTF-8")
    @Operation(summary = "删除调度器")
    public void deleteScheduler(@PathVariable Long id) {
        reportSchedulerService.deleteById(id);
    }
} 