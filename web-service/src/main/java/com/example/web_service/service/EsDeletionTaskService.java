package com.example.web_service.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.web_service.entity.Collector;
import com.example.web_service.service.elasticsearch.ElasticsearchSyncService;

@Service
public class EsDeletionTaskService {
    public static class TaskStatus {
        public String taskId;
        public String state; // PENDING, RUNNING, DONE, FAILED
        public Long deletedCount;
        public String errorMessage;
        public Long startedAt;
        public Long finishedAt;
    }

    private final Map<String, TaskStatus> tasks = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Autowired
    private CollectorService collectorService;

    @Autowired
    private ElasticsearchSyncService elasticsearchSyncService;

    public String startDeletion(Long collectorId) {
        String taskId = UUID.randomUUID().toString();
        TaskStatus status = new TaskStatus();
        status.taskId = taskId;
        status.state = "PENDING";
        status.deletedCount = 0L;
        status.startedAt = Instant.now().toEpochMilli();
        tasks.put(taskId, status);

        // Get collector info before starting async task to avoid "not found" issues
        String sessionId = null;
        try {
            Collector c = collectorService.getCollectorById(collectorId);
            sessionId = c != null ? c.getSessionId() : null;
        } catch (Exception e) {
            // If collector not found, still proceed with null sessionId
            sessionId = null;
        }
        
        final String finalSessionId = sessionId;

        executor.submit(() -> {
            status.state = "RUNNING";
            try {
                long deleted = 0L;
                if (finalSessionId != null && !finalSessionId.isBlank()) {
                    deleted = elasticsearchSyncService.deleteBySessionId(finalSessionId);
                }
                status.deletedCount = deleted;
                status.state = "DONE";
            } catch (Exception e) {
                status.state = "FAILED";
                status.errorMessage = e.getMessage();
            } finally {
                status.finishedAt = Instant.now().toEpochMilli();
            }
        });

        return taskId;
    }

    public TaskStatus getStatus(String taskId) {
        return tasks.get(taskId);
    }
}


