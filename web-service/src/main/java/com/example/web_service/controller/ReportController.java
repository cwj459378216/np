package com.example.web_service.controller;

import com.example.web_service.entity.Report;
import com.example.web_service.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;
import java.util.HashMap;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "报告管理", description = "报告的增删改查操作")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping
    @Operation(summary = "获取所有报告")
    public List<Report> getAllReports() {
        return reportService.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取单个报告")
    public Report getReport(@PathVariable Long id) {
        return reportService.findById(id);
    }

    @PostMapping
    @Operation(summary = "创建报告")
    public Report createReport(@RequestBody Report report) {
        return reportService.save(report);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除报告")
    public void deleteReport(@PathVariable Long id) {
        reportService.deleteById(id);
    }

    @DeleteMapping
    @Operation(summary = "批量删除报告")
    public void deleteReports(@RequestBody List<Long> ids) {
        reportService.deleteByIds(ids);
    }

    @GetMapping("/download/{id}")
    @Operation(summary = "下载报告")
    public ResponseEntity<Resource> downloadReport(@PathVariable Long id) {
        Report report = reportService.findById(id);
        Resource resource = reportService.loadReportFile(report.getFilePath());
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + report.getName() + "\"")
            .body(resource);
    }

    @GetMapping("/latest-update")
    public ResponseEntity<Map<String, String>> getLatestUpdate() {
        LocalDateTime latestUpdate = reportService.getLatestUpdate();
        Map<String, String> response = new HashMap<>();
        response.put("lastUpdate", latestUpdate != null ? 
            latestUpdate.toString() : "");
        return ResponseEntity.ok(response);
    }
} 