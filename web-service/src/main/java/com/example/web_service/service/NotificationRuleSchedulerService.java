package com.example.web_service.service;

import com.example.web_service.entity.NotificationRule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Service
public class NotificationRuleSchedulerService {
    private static final Logger log = LoggerFactory.getLogger(NotificationRuleSchedulerService.class);

    private final Map<Long, ScheduledFuture<?>> tasks = new ConcurrentHashMap<>();
    private final Set<Long> running = ConcurrentHashMap.newKeySet();
    private final Map<Long, String> tokens = new ConcurrentHashMap<>();

    private final ThreadPoolTaskScheduler scheduler;
    private final NotificationRuleService ruleService;
    private final NotificationRuleExecutorService executor;

    @Autowired
    public NotificationRuleSchedulerService(NotificationRuleService ruleService, NotificationRuleExecutorService executor) {
        this.ruleService = ruleService;
        this.executor = executor;
        this.scheduler = new ThreadPoolTaskScheduler();
        this.scheduler.setPoolSize(4);
        this.scheduler.setThreadNamePrefix("notif-rule-");
        this.scheduler.initialize();
    }

    @PostConstruct
    public void init() {
        scheduleAllActive();
    }

    public synchronized void scheduleAllActive() {
        ruleService.findAll().forEach(r -> {
            if ("Active".equalsIgnoreCase(String.valueOf(r.getStatus()))) {
                scheduleRule(r.getId());
            }
        });
    }

    public synchronized void cancelRule(Long ruleId) {
        ScheduledFuture<?> f = tasks.remove(ruleId);
        if (f != null) {
            f.cancel(false);
            log.info("Cancelled schedule for rule {}", ruleId);
        }
        tokens.remove(ruleId);
    }

    public synchronized void scheduleRule(Long ruleId) {
        NotificationRule r;
        try { r = ruleService.findById(ruleId); } catch (Exception ignored) { return; }
        if (r == null) return;
        if (!"Active".equalsIgnoreCase(String.valueOf(r.getStatus()))) { cancelRule(ruleId); return; }

        Duration window = executor.parseWindow(r.getTimeWindow());
        if (window.isZero() || window.isNegative()) { cancelRule(ruleId); return; }

        LocalDateTime base = r.getUpdatedAt() != null ? r.getUpdatedAt() : (r.getCreatedAt() != null ? r.getCreatedAt() : LocalDateTime.now());
        LocalDateTime fireTime = base.plus(window);
        Instant instant = fireTime.atZone(ZoneId.systemDefault()).toInstant();
        if (instant.isBefore(Instant.now())) {
            instant = Instant.now().plusMillis(500);
        }
        final LocalDateTime fBase = base;
        final Duration fWindow = window;

        // Cancel previous schedule to avoid duplicates
        cancelRule(ruleId);

        // Assign execution token
        final String token = UUID.randomUUID().toString();
        tokens.put(ruleId, token);

        ScheduledFuture<?> future = scheduler.schedule(() -> {
            // Ignore outdated task
            if (!token.equals(tokens.get(ruleId))) {
                log.info("Skip outdated scheduled task for rule {}", ruleId);
                return;
            }
            // Concurrency guard: skip if already running
            if (!running.add(ruleId)) {
                log.warn("Skip concurrent execution for rule {}", ruleId);
                return;
            }
            try {
                NotificationRule current = ruleService.findById(ruleId);
                if (current == null || !"Active".equalsIgnoreCase(String.valueOf(current.getStatus()))) return;
                // Stale-window guard: if updatedAt already moved forward, this task is stale
                if (current.getUpdatedAt() != null && current.getUpdatedAt().isAfter(fBase)) {
                    log.info("Skip stale task for rule {}: expected base={}, actual updatedAt={}", ruleId, fBase, current.getUpdatedAt());
                    return;
                }
                executor.processWindow(current, fBase, fWindow);
                NotificationRule latest = ruleService.findById(ruleId);
                LocalDateTime newBase = (latest != null && latest.getUpdatedAt() != null)
                        ? latest.getUpdatedAt() : fBase.plus(fWindow);

                // 如果下一次触发时间(newBase + window)已经落后当前时间，按窗口长度跳过过期周期，避免短时间内重复触发
                try {
                    LocalDateTime now = LocalDateTime.now();
                    LocalDateTime nextFire = newBase.plus(fWindow);
                    if (nextFire.isBefore(now)) {
                        long windowMillis = fWindow.toMillis();
                        if (windowMillis > 0) {
                            long behindMillis = java.time.Duration.between(nextFire, now).toMillis();
                            long cycles = (behindMillis / windowMillis) + 1; // 需要跳过的完整周期数
                            newBase = newBase.plus(fWindow.multipliedBy(cycles));
                        } else {
                            // 安全兜底：窗口异常(<=0)时直接不再重复调度
                            log.warn("Window duration invalid ({}), skip further scheduling for rule {}", fWindow, ruleId);
                            return;
                        }
                    }
                } catch (Exception adjustEx) {
                    log.warn("Adjust next schedule base failed for rule {}", ruleId, adjustEx);
                }

                scheduleRule(ruleId, newBase);
            } catch (Exception ex) {
                log.error("Rule schedule task failed, ruleId={}", ruleId, ex);
                scheduleRule(ruleId, fBase.plus(fWindow));
            } finally {
                running.remove(ruleId);
            }
        }, instant);

        tasks.put(ruleId, future);
        log.info("Scheduled rule {} at {}", ruleId, fireTime);
    }

    private synchronized void scheduleRule(Long ruleId, LocalDateTime base) {
        NotificationRule r;
        try { r = ruleService.findById(ruleId); } catch (Exception ignored) { return; }
        if (r == null) return;
        if (!"Active".equalsIgnoreCase(String.valueOf(r.getStatus()))) { cancelRule(ruleId); return; }
        Duration window = executor.parseWindow(r.getTimeWindow());
        if (window.isZero() || window.isNegative()) { cancelRule(ruleId); return; }
        LocalDateTime fireTime = base.plus(window);
        Instant instant = fireTime.atZone(ZoneId.systemDefault()).toInstant();
        if (instant.isBefore(Instant.now())) {
            instant = Instant.now().plusMillis(500);
        }
        final LocalDateTime fBase = base;
        final Duration fWindow = window;

        // Cancel previous schedule to avoid duplicates
        cancelRule(ruleId);

        // Assign execution token
        final String token = UUID.randomUUID().toString();
        tokens.put(ruleId, token);

        ScheduledFuture<?> future = scheduler.schedule(() -> {
            if (!token.equals(tokens.get(ruleId))) {
                log.info("Skip outdated scheduled task for rule {}", ruleId);
                return;
            }
            if (!running.add(ruleId)) {
                log.warn("Skip concurrent execution for rule {}", ruleId);
                return;
            }
            try {
                NotificationRule current = ruleService.findById(ruleId);
                if (current == null || !"Active".equalsIgnoreCase(String.valueOf(current.getStatus()))) return;
                // if (current.getUpdatedAt() != null && current.getUpdatedAt().isAfter(fBase)) {
                //     log.info("Skip stale task for rule {}: expected base={}, actual updatedAt={}", ruleId, fBase, current.getUpdatedAt());
                //     return;
                // }
                executor.processWindow(current, fBase, fWindow);
                NotificationRule latest = ruleService.findById(ruleId);
                LocalDateTime newBase = (latest != null && latest.getUpdatedAt() != null)
                        ? latest.getUpdatedAt() : fBase.plus(fWindow);

                // 避免紧接着再次快速触发：如果下一轮时间已过，用窗口长度向前推进到最近的未来
                try {
                    LocalDateTime now = LocalDateTime.now();
                    LocalDateTime nextFire = newBase.plus(fWindow);
                    if (nextFire.isBefore(now)) {
                        long windowMillis = fWindow.toMillis();
                        if (windowMillis > 0) {
                            long behindMillis = java.time.Duration.between(nextFire, now).toMillis();
                            long cycles = (behindMillis / windowMillis) + 1;
                            newBase = newBase.plus(fWindow.multipliedBy(cycles));
                        } else {
                            log.warn("Window duration invalid ({}), skip further scheduling for rule {}", fWindow, ruleId);
                            return;
                        }
                    }
                } catch (Exception adjustEx) {
                    log.warn("Adjust next schedule base failed for rule {}", ruleId, adjustEx);
                }

                scheduleRule(ruleId, newBase);
            } catch (Exception ex) {
                log.error("Rule schedule task failed, ruleId={}", ruleId, ex);
                scheduleRule(ruleId, fBase.plus(fWindow));
            } finally {
                running.remove(ruleId);
            }
        }, instant);

        tasks.put(ruleId, future);
        log.info("Rescheduled rule {} at {}", ruleId, fireTime);
    }
}
