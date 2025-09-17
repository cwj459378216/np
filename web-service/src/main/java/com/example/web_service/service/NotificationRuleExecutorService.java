package com.example.web_service.service;

import com.example.web_service.entity.NotificationRule;
import com.example.web_service.entity.NotificationSetting;
import com.example.web_service.service.elasticsearch.ElasticsearchSyncService;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.json.JsonData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

@Service
public class NotificationRuleExecutorService {
    private static final Logger log = LoggerFactory.getLogger(NotificationRuleExecutorService.class);

    private static final ObjectMapper JSON = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);

    @Autowired private NotificationRuleService ruleService;
    @Autowired private NotificationSettingService notificationSettingService;
    @Autowired private ElasticsearchSyncService es;

    /**
     * Execute the rule against ES in the fixed window [base, base+window].
     * Returns true if notification was sent.
     */
    public boolean processWindow(NotificationRule rule, LocalDateTime base, Duration window) {
        try {
            if (rule == null || window == null || window.isZero() || window.isNegative()) return false;
            LocalDateTime end = base.plus(window);
            long startMs = base.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
            long endMs = end.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();

            BoolQuery.Builder qb = new BoolQuery.Builder();
            qb.must(m -> m.range(r -> r.field("timestamp").gte(JsonData.of(startMs)).lte(JsonData.of(endMs))));
            if (Objects.equals(rule.getTriggerCondition(), "condition")) {
                List<Map<String,Object>> filters = coerceFilterList(rule.getFilters());
                for (Map<String, Object> f : filters) {
                    String field = String.valueOf(f.getOrDefault("field", "")).trim();
                    Object val = f.get("value");
                    if (field.isEmpty() || val == null) continue;
                    String esField = mapEsField(field);
                    qb.must(m -> m.match(mm -> mm.field(esField).query(String.valueOf(val))));
                }
            }
            Query query = Query.of(q -> q.bool(qb.build()));

            // Log ES DSL for troubleshooting
            try {
                Map<String, Object> fullBody = new HashMap<>();
                Map<String, Object> queryBody = new HashMap<>();
                Map<String, Object> bool = new HashMap<>();
                List<Object> must = new ArrayList<>();

                Map<String, Object> tsRange = new HashMap<>();
                Map<String, Object> tsBounds = new HashMap<>();
                tsBounds.put("gte", startMs);
                tsBounds.put("lte", endMs);
                tsRange.put("timestamp", tsBounds);
                Map<String, Object> rangeQuery = new HashMap<>();
                rangeQuery.put("range", tsRange);
                must.add(rangeQuery);

                if (Objects.equals(rule.getTriggerCondition(), "condition")) {
                    List<Map<String,Object>> filters = coerceFilterList(rule.getFilters());
                    for (Map<String, Object> f : filters) {
                        String field = String.valueOf(f.getOrDefault("field", "")).trim();
                        Object val = f.get("value");
                        if (field.isEmpty() || val == null) continue;
                        String esField = mapEsField(field);
                        Map<String, Object> matchField = new HashMap<>();
                        Map<String, Object> matchBody = new HashMap<>();
                        matchBody.put("query", String.valueOf(val));
                        matchField.put(esField, matchBody);
                        Map<String, Object> matchQuery = new HashMap<>();
                        matchQuery.put("match", matchField);
                        must.add(matchQuery);
                    }
                }
                bool.put("must", must);
                queryBody.put("bool", bool);
                fullBody.put("query", queryBody);

                String json = JSON.writeValueAsString(fullBody);
                log.info("ES search request: index=event-realtime, body=\n{}", json);
            } catch (Exception e) {
                log.warn("Failed to serialize ES query DSL for logging", e);
            }

            List<Map<String,Object>> rawHits = es.searchRaw("event-realtime", query);
            List<Map<String,Object>> hits = rawHits != null ? rawHits : List.of();

            // Decide new updatedAt according to requirement
            LocalDateTime newUpdatedAt;
            boolean hasHits = !hits.isEmpty();
            if (hasHits) {
                long latestTs = 0L;
                for (Map<String, Object> h : hits) {
                    Object v = h != null ? h.get("timestamp") : null;
                    long ts = parseToMillis(v);
                    if (ts > latestTs) latestTs = ts;
                }
                if (latestTs <= 0) {
                    // Fallback to end of window if timestamps are missing
                    latestTs = endMs;
                }
                newUpdatedAt = Instant.ofEpochMilli(latestTs).atZone(ZoneId.systemDefault()).toLocalDateTime();
            } else {
                newUpdatedAt = LocalDateTime.now();
            }

            // Try sending only when hits exist (as the rule is triggered)
            if (hasHits) {
                String subject = "Notification Rule Triggered: " + rule.getRuleName();
                int count = hits.size();
                String content = "Rule '" + rule.getRuleName() + "' matched " + count + " events in window [" + startMs + "," + endMs + "]";
                try {
                    NotificationSetting setting = notificationSettingService.findById(rule.getNotificationSettingId());
                    if (setting == null) {
                        log.warn("Notification setting not found for rule {}", rule.getId());
                    } else {
                        notificationSettingService.sendNotification(setting, subject, content);
                    }
                } catch (Exception ex) {
                    // Log and continue to update updatedAt as window has been processed
                    log.error("Failed sending notification for rule {}", rule.getId(), ex);
                }
            }

            // Persist updatedAt regardless of hit
            rule.setUpdatedAt(newUpdatedAt);
            ruleService.save(rule);
            return hasHits;
        } catch (Exception ex) {
            log.error("Error executing notification rule window. ruleId={}", rule != null ? rule.getId() : null, ex);
            return false;
        }
    }

    public Duration parseWindow(String window) {
        if (window == null || window.isBlank()) return Duration.ZERO;
        String w = window.trim().toLowerCase();
        try {
            if (w.contains("day")) {
                long n = extractNumber(w);
                return Duration.ofDays(n);
            } else if (w.contains("hour")) {
                long n = extractNumber(w);
                return Duration.ofHours(n);
            } else if (w.contains("min")) {
                long n = extractNumber(w);
                return Duration.ofMinutes(n);
            }
        } catch (Exception ignored) {}
        if (w.equals("24 hours")) return Duration.ofHours(24);
        if (w.equals("7 days")) return Duration.ofDays(7);
        if (w.equals("30 days")) return Duration.ofDays(30);
        if (w.matches("\\d+\\s*h")) return Duration.ofHours(Long.parseLong(w.replace("h","")));
        if (w.matches("\\d+\\s*d")) return Duration.ofDays(Long.parseLong(w.replace("d","")));
        return Duration.ZERO;
    }

    private long extractNumber(String s) {
        String num = s.replaceAll("[^0-9]", "");
        return num.isEmpty() ? 0 : Long.parseLong(num);
    }

    private List<Map<String,Object>> coerceFilterList(Object filters) {
        if (filters == null) return List.of();
        if (filters instanceof List<?>) {
            List<?> raw = (List<?>) filters;
            List<Map<String,Object>> out = new ArrayList<>();
            for (Object o : raw) {
                if (o instanceof Map<?,?> m) {
                    out.add(m.entrySet().stream().collect(Collectors.toMap(e -> String.valueOf(e.getKey()), e -> e.getValue())));
                }
            }
            return out;
        }
        return List.of();
    }

    private long parseToMillis(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) {
            long val = n.longValue();
            // Normalize epoch seconds to milliseconds if needed
            return val < 1_000_000_000_000L ? val * 1000L : val;
        }
        String s = String.valueOf(v).trim();
        if (s.isEmpty()) return 0L;

        // Pure number string -> epoch seconds or milliseconds
        if (s.matches("^\\d+$")) {
            try {
                long val = Long.parseLong(s);
                return val < 1_000_000_000_000L ? val * 1000L : val;
            } catch (Exception ignored) {}
        }

        // ISO-8601 instant with Z
        try { return Instant.parse(s).toEpochMilli(); } catch (Exception ignored) {}
        // ISO-8601 with offset
        try { return OffsetDateTime.parse(s).toInstant().toEpochMilli(); } catch (Exception ignored) {}

        // Custom: support formats like 2025-09-17T00:44:56.588024+0000 (offset without colon, 6 fraction digits)
        DateTimeFormatter[] offsetCustom = new DateTimeFormatter[] {
                DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSSXX"), // +0000
                DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXX"), // also +0000
                DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXXX"), // +00:00
                DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXX"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXXX"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXXXX")
        };
        for (DateTimeFormatter f : offsetCustom) {
            try {
                return OffsetDateTime.parse(s, f).toInstant().toEpochMilli();
            } catch (Exception ignored) {}
        }

        // Allow space separator and fractional seconds
        String s2 = (s.contains(" ") && !s.contains("T")) ? s.replace(' ', 'T') : s;
        DateTimeFormatter[] fmts = new DateTimeFormatter[] {
                DateTimeFormatter.ISO_LOCAL_DATE_TIME,
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS")
        };
        for (DateTimeFormatter f : fmts) {
            try {
                LocalDateTime ldt = LocalDateTime.parse(s2, f);
                return ldt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
            } catch (Exception ignored) {}
        }
        return 0L;
    }

    private String mapEsField(String field) {
        if (field == null) return null;
        String f = field.trim();
        if (f.equalsIgnoreCase("severity")) return "alert.severity";
        if (f.equalsIgnoreCase("signature")) return "alert.signature";
        return f;
    }
}
