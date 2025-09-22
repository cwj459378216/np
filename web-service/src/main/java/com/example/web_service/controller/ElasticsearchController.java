package com.example.web_service.controller;

import com.example.web_service.model.es.ConnRecord;
import com.example.web_service.model.es.TrendingData;
import com.example.web_service.model.es.widget.WidgetQueryRequest;
import com.example.web_service.service.elasticsearch.ElasticsearchSyncService;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.json.JsonData;
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.CountResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/es")
@Tag(name = "Elasticsearch接口", description = "用于查询ES数据")
public class ElasticsearchController {

    private static final Logger log = LoggerFactory.getLogger(ElasticsearchController.class);

    @Autowired
    private ElasticsearchSyncService elasticsearchSyncService;
    
    @Autowired
    private ElasticsearchClient esClient;

    private static final String INDEX_NAME = "conn-realtime";

    private static String autoIntervalFromSpan(long spanMillis, int desiredPoints) {
        // 目标：最小 1m，最大 1y，尽量让桶数量接近 desiredPoints
        if (spanMillis <= 0) return "1m";
        long targetBucketMs = Math.max(60_000L, spanMillis / Math.max(1, desiredPoints));

        // 采用固定与日历混合候选，label 与 ElasticsearchSyncService.applyInterval 完全兼容
        // 计算用近似毫秒，选择用 label
        class Cand { long ms; String label; Cand(long ms, String label){ this.ms=ms; this.label=label; } }
        long MIN = 60_000L;
        long H = 60 * 60_000L, D = 24 * H;
        Cand[] cands = new Cand[]{
            new Cand(1 * MIN, "1m"),
            new Cand(5 * MIN, "5m"),
            new Cand(15 * MIN, "15m"),
            new Cand(30 * MIN, "30m"),
            new Cand(1 * H, "1h"),
            new Cand(3 * H, "3h"),
            new Cand(6 * H, "6h"),
            new Cand(12 * H, "12h"),
            new Cand(1 * D, "1d"),
            new Cand(3 * D, "3d"),
            new Cand(7 * D, "7d"),
            new Cand(14 * D, "14d"),
            // 月/季/年用日历型，近似 30/90/365 天作比较
            new Cand(30 * D, "1mon"),
            new Cand(90 * D, "1q"),
            new Cand(180 * D, "180d"), // 半年可用 fixed 180d
            new Cand(365 * D, "1y")
        };
        for (Cand c : cands) {
            if (c.ms >= targetBucketMs) return c.label;
        }
        // 超过一年仍然返回 1y，避免无限增大
        return "1y";
    }

    @GetMapping("/search")
    @Operation(summary = "查询ES数据", description = "从conn-realtime索引中查询数据")
    public List<ConnRecord> searchData(@RequestParam(required = false) String keyword) throws IOException {
        Query query = keyword != null 
            ? Query.of(q -> q.match(m -> m.field("message").query(keyword)))
            : Query.of(q -> q.matchAll(m -> m));
            
        return elasticsearchSyncService.searchConnRecords(INDEX_NAME, query);
    }

    @PostMapping("/search/advanced")
    @Operation(summary = "高级查询", description = "使用自定义查询条件搜索数据")
    public List<ConnRecord> advancedSearch(@RequestBody Query query) throws IOException {
        return elasticsearchSyncService.searchConnRecords(INDEX_NAME, query);
    }

    @GetMapping("/trending")
    @Operation(summary = "查询趋势数据", description = "根据时间范围和其他条件查询数据趋势")
    public List<TrendingData> getTrending(
            @RequestParam String startTime,
            @RequestParam String endTime,
            @RequestParam(required = false) String filePath,
            @RequestParam(defaultValue = "conn-realtime") String index,
            @RequestParam(defaultValue = "auto") String interval
    ) throws IOException {
        String useInterval = interval;
        if ("auto".equalsIgnoreCase(interval)) {
            try {
                long s = java.time.Instant.parse(startTime).toEpochMilli();
                long e = java.time.Instant.parse(endTime).toEpochMilli();
                useInterval = autoIntervalFromSpan(Math.max(0, e - s), 200);
            } catch (Exception ignore) { useInterval = "1h"; }
        }
        return elasticsearchSyncService.getTrending(startTime, endTime, filePath, index, useInterval);
    }

    @GetMapping("/protocol-trends")
    @Operation(summary = "查询协议交易趋势", description = "按serviceName聚合获取前10个服务的时间序列趋势数据，时间参数使用毫秒时间戳")
    public Map<String, List<TrendingData>> getProtocolTrends(
            @RequestParam Long startTime,
            @RequestParam Long endTime,
            @RequestParam(required = false) String filePath,
            @RequestParam(defaultValue = "auto") String interval
    ) throws IOException {
        String useInterval = "auto".equalsIgnoreCase(interval)
                ? autoIntervalFromSpan(Math.max(0, endTime - startTime), 200)
                : interval;
        return elasticsearchSyncService.getProtocolTrends(startTime, endTime, filePath, useInterval);
    }

    @GetMapping("/bandwidth-trends")
    @Operation(summary = "查询带宽趋势", description = "获取所有可用Channel的带宽利用率趋势数据，时间参数使用毫秒时间戳")
    public Map<String, List<TrendingData>> getBandwidthTrends(
            @RequestParam Long startTime,
            @RequestParam Long endTime,
            @RequestParam(required = false) String filePath,
            @RequestParam(defaultValue = "auto") String interval
    ) throws IOException {
        String useInterval = "auto".equalsIgnoreCase(interval)
                ? autoIntervalFromSpan(Math.max(0, endTime - startTime), 200)
                : interval;
        log.info("Received bandwidth trends request - startTime: {}, endTime: {}, filePath: {}, interval: {}", startTime, endTime, filePath, useInterval);
        Map<String, List<TrendingData>> result = elasticsearchSyncService.getBandwidthTrends(startTime, endTime, filePath, useInterval);
        log.info("Returning bandwidth trends with {} channels", result.size());
        return result;
    }

    @GetMapping("/network-protocol-trends")
    @Operation(summary = "查询网络协议趋势", description = "从conn-realtime索引根据protoName统计时间序列趋势，时间参数使用毫秒时间戳")
    public Map<String, List<TrendingData>> getNetworkProtocolTrends(
            @RequestParam Long startTime,
            @RequestParam Long endTime,
            @RequestParam(required = false) String filePath,
            @RequestParam(defaultValue = "auto") String interval
    ) throws IOException {
        String useInterval = "auto".equalsIgnoreCase(interval)
                ? autoIntervalFromSpan(Math.max(0, endTime - startTime), 200)
                : interval;
        log.info("Received network protocol trends request - startTime: {}, endTime: {}, filePath: {}, interval: {}", startTime, endTime, filePath, useInterval);
        Map<String, List<TrendingData>> result = elasticsearchSyncService.getConnProtocolNameTrends(startTime, endTime, filePath, useInterval);
        log.info("Returning network protocol trends with {} protocols", result.size());
        return result;
    }

    @GetMapping("/service-name-aggregation")
    @Operation(summary = "查询服务名称聚合数据", description = "获取conn-realtime索引中serviceName字段的Top N聚合统计数据，支持时间范围过滤")
    public Map<String, Object> getServiceNameAggregation(
            @RequestParam(defaultValue = "10") Integer topN,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) String filePath
    ) throws IOException {
        log.info("Received service name aggregation request - topN: {}, startTime: {}, endTime: {}, filePath: {}", topN, startTime, endTime, filePath);
        Map<String, Object> result = elasticsearchSyncService.getServiceNameAggregation(topN, startTime, endTime, filePath);
        log.info("Returning service name aggregation with {} entries", result.size());
        return result;
    }

    @GetMapping("/query")
    @Operation(summary = "查询ES数据", description = "根据时间范围和其他条件查询数据")
    public Map<String, Object> queryData(
            @RequestParam String startTime,
            @RequestParam String endTime,
            @RequestParam(required = false) String filePath,
            @RequestParam(defaultValue = "conn-realtime") String index,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "0") Integer from,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sortField,
            @RequestParam(defaultValue = "asc") String sortOrder
    ) throws IOException {
        // 构建时间范围查询
        var rangeQuery = Query.of(q -> q
            .range(r -> r
                .field("timestamp")
                .gte(JsonData.of(startTime))
                .lte(JsonData.of(endTime))
            )
        );

        // 构建查询条件列表
        java.util.List<Query> mustQueries = new java.util.ArrayList<>();
        mustQueries.add(rangeQuery);

        // 如果指定了filePath，添加过滤条件
        if (filePath != null) {
            mustQueries.add(Query.of(q -> q
                .match(m -> m
                    .field("filePath")
                    .query(filePath)
                )
            ));
        }

        // 如果指定了搜索关键词，添加多字段搜索
        if (search != null && !search.trim().isEmpty()) {
            String searchTerm = search.trim();
            mustQueries.add(Query.of(q -> q
                .multiMatch(m -> m
                    .query(searchTerm)
                    .fields("*") // 搜索所有字段
                    .type(co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType.BestFields)
                    .fuzziness("AUTO") // 启用模糊搜索
                )
            ));
        }

        // 构建最终查询
        var query = Query.of(q -> q
            .bool(b -> {
                b.must(mustQueries);
                return b;
            })
        );

        return elasticsearchSyncService.searchRawWithPagination(index, query, size, from);
    }

    @GetMapping("/query-by-filepath")
    @Operation(summary = "根据文件路径查询数据时间范围", description = "根据filePath查询数据的时间范围，返回第一条和最后一条数据的时间")
    public Map<String, Object> queryDataByFilePath(
            @RequestParam String filePath,
            @RequestParam(defaultValue = "*") String index
    ) throws IOException {
        // 统一输出格式为: yyyy-MM-dd'T'HH:mm:ss.SSS （UTC，包含毫秒，无时区后缀）
        final java.time.format.DateTimeFormatter targetFormatter =
            java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS")
                .withZone(java.time.ZoneOffset.UTC);

        // 将不同格式的时间戳（ISO字符串/epoch毫秒/epoch秒(含小数)）统一到上述格式
        java.util.function.Function<Object, String> normalizeTimestamp = (value) -> {
            if (value == null) {
                return null;
            }
            try {
                if (value instanceof String) {
                    String text = ((String) value).trim();
                    // 先尝试按ISO-8601解析（支持微秒格式）
                    try {
                        java.time.Instant instant;
                        // 处理可能包含微秒的时间戳格式（如 2025-07-14T01:10:39.377460）
                        if (text.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{6}")) {
                            // 微秒格式，需要转换为纳秒
                            instant = java.time.LocalDateTime.parse(text, 
                                java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSS"))
                                .atZone(java.time.ZoneOffset.UTC).toInstant();
                        } else if (text.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}")) {
                            // 毫秒格式
                            instant = java.time.LocalDateTime.parse(text, 
                                java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS"))
                                .atZone(java.time.ZoneOffset.UTC).toInstant();
                        } else if (text.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}")) {
                            // 秒格式
                            instant = java.time.LocalDateTime.parse(text, 
                                java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"))
                                .atZone(java.time.ZoneOffset.UTC).toInstant();
                        } else {
                            // 标准ISO格式
                            instant = java.time.Instant.parse(text);
                        }
                        return targetFormatter.format(instant);
                    } catch (Exception ignore) { /* fallback to numeric parsing */ }

                    // 再尝试按数字解析（可能是秒、毫秒，秒可能带小数）
                    if (text.matches("^-?\\d+(\\.\\d+)?$") ) {
                        double numeric = Double.parseDouble(text);
                        if (numeric > 1.0e12) { // 绝大多数情况下是毫秒
                            long millis = (long) numeric;
                            java.time.Instant instant = java.time.Instant.ofEpochMilli(millis);
                            return targetFormatter.format(instant);
                        } else { // 视为秒（可能带小数）
                            long seconds = (long) Math.floor(numeric);
                            long nanos = (long) Math.round((numeric - seconds) * 1_000_000_000L);
                            java.time.Instant instant = java.time.Instant.ofEpochSecond(seconds, nanos);
                            return targetFormatter.format(instant);
                        }
                    }
                } else if (value instanceof Number) {
                    double numeric = ((Number) value).doubleValue();
                    if (numeric > 1.0e12) { // 毫秒
                        long millis = (long) numeric;
                        java.time.Instant instant = java.time.Instant.ofEpochMilli(millis);
                        return targetFormatter.format(instant);
                    } else { // 秒（可能带小数）
                        long seconds = (long) Math.floor(numeric);
                        long nanos = (long) Math.round((numeric - seconds) * 1_000_000_000L);
                        java.time.Instant instant = java.time.Instant.ofEpochSecond(seconds, nanos);
                        return targetFormatter.format(instant);
                    }
                } else if (value instanceof java.util.Date) {
                    java.time.Instant instant = java.time.Instant.ofEpochMilli(((java.util.Date) value).getTime());
                    return targetFormatter.format(instant);
                } else if (value instanceof java.time.Instant) {
                    return targetFormatter.format((java.time.Instant) value);
                }
            } catch (Exception e) {
                log.warn("Failed to normalize timestamp value: {}", value, e);
            }
            return String.valueOf(value);
        };

        // ===== 构建 filePath 精确过滤 =====
        // 问题背景: 原先使用 match(filePath) 可能因分词/分析器导致模糊匹配, 引入非该 session 的旧文档, 造成最早时间异常 (如 1970…).
        // 修复策略: 优先使用 term 查询 filePath.keyword (exact), 失败则回退 term(filePath), 再回退 match(filePath)。
        Query termKeyword = Query.of(q -> q.term(t -> t.field("filePath.keyword").value(v -> v.stringValue(filePath))));
        Query termPlain = Query.of(q -> q.term(t -> t.field("filePath").value(v -> v.stringValue(filePath))));
        Query matchPlain = Query.of(q -> q.match(m -> m.field("filePath").query(filePath)));

        // 下面需要在 lambda 中赋值, 变量需保持 effectively final, 使用单元素数组承载引用
        // 使用简单 Holder 避免泛型数组的 unchecked 警告
        class Holder<T> { T v; }
        final Holder<Query> selectedQueryRef = new Holder<>();
        final Holder<SearchResponse<JsonData>> firstResponseRef = new Holder<>();
        SearchResponse<JsonData> lastResponse = null; // 不在 lambda 内部重新赋值
        String queryMode = null; // 仅用于调试输出，可帮助确认命中哪种方式

        // 逐一尝试查询策略，找到第一个有结果的
        for (var candidate : new Query[]{termKeyword, termPlain, matchPlain}) {
            try {
                SearchResponse<JsonData> testFirst = esClient.search(s -> s
                    .index(index)
                    .query(candidate)
                    .size(1)
                    .sort(sort -> sort.field(f -> f.field("timestamp").order(co.elastic.clients.elasticsearch._types.SortOrder.Asc)))
                , JsonData.class);
                
                if (testFirst.hits() != null && !testFirst.hits().hits().isEmpty()) {
                    selectedQueryRef.v = candidate;
                    firstResponseRef.v = testFirst;
                    queryMode = (candidate == termKeyword) ? "term:filePath.keyword" : 
                               (candidate == termPlain) ? "term:filePath" : "match:filePath";
                    break;
                }
            } catch (Exception e) {
                log.warn("Query strategy failed for filePath={}, trying next approach", filePath, e);
                // 继续尝试下一种策略
            }
        }

        if (selectedQueryRef.v == null) {
            // 没有任何命中: 兜底执行 match 以便后续逻辑仍可继续
            selectedQueryRef.v = matchPlain;
            try {
                firstResponseRef.v = esClient.search(s -> s
                    .index(index)
                    .query(selectedQueryRef.v)
                    .size(1)
                    .sort(sort -> sort.field(f -> f.field("timestamp").order(co.elastic.clients.elasticsearch._types.SortOrder.Asc)))
                , JsonData.class);
            } catch (Exception e) {
                log.warn("Fallback query also failed for filePath={}", filePath, e);
                firstResponseRef.v = null;
            }
            queryMode = "fallback:match";
        }

        // 使用相同的查询策略获取最后一条记录
        try {
            lastResponse = esClient.search(s -> s
                .index(index)
                .query(selectedQueryRef.v)
                .size(1)
                .sort(sort -> sort.field(f -> f.field("timestamp").order(co.elastic.clients.elasticsearch._types.SortOrder.Desc)))
            , JsonData.class);
        } catch (Exception e) {
            log.warn("Failed to get last record for filePath={}", filePath, e);
            lastResponse = null;
        }

        if (log.isDebugEnabled()) {
            log.debug("/query-by-filepath using query mode: {} for filePath={} index={}", queryMode, filePath, index);
        }

        // 提取时间戳
        String firstTimestamp = null;
        String lastTimestamp = null;
        
    SearchResponse<JsonData> firstResponse = firstResponseRef.v;
        if (firstResponse != null && firstResponse.hits() != null && firstResponse.hits().hits().size() > 0) {
            var firstHit = firstResponse.hits().hits().get(0);
            var firstSrc = firstHit.source();
            if (firstSrc != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> firstRecord = (Map<String, Object>) firstSrc.to(Map.class);
                Object ts = firstRecord.get("timestamp");
                firstTimestamp = normalizeTimestamp.apply(ts);
            }
        }
        
    if (lastResponse != null && lastResponse.hits() != null && lastResponse.hits().hits().size() > 0) {
            var lastHit = lastResponse.hits().hits().get(0);
            var lastSrc = lastHit.source();
            if (lastSrc != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> lastRecord = (Map<String, Object>) lastSrc.to(Map.class);
                Object ts = lastRecord.get("timestamp");
                lastTimestamp = normalizeTimestamp.apply(ts);
            }
        }

        // 如果没有查询到数据，返回最近一天的时间范围
        if (firstTimestamp == null || lastTimestamp == null) {
            java.time.Instant now = java.time.Instant.now();
            java.time.Instant oneDayAgo = now.minus(java.time.Duration.ofDays(1));
            
            // 使用与其他时间戳相同的格式
            firstTimestamp = targetFormatter.format(oneDayAgo);
            lastTimestamp = targetFormatter.format(now);
            
            return Map.of(
                "filePath", filePath,
                "firstTimestamp", firstTimestamp,
                "lastTimestamp", lastTimestamp,
                "hasData", false,
                "isDefaultRange", true,
                "queryMode", queryMode != null ? queryMode : "no-data"
            );
        }

        return Map.of(
            "filePath", filePath,
            "firstTimestamp", firstTimestamp,
            "lastTimestamp", lastTimestamp,
            "hasData", true,
            "isDefaultRange", false,
            "queryMode", queryMode
        );
    }

    @GetMapping("/indices")
    @Operation(summary = "获取所有索引名称", description = "列出当前集群中可用的索引名称")
    public List<String> listIndices() throws IOException {
        return elasticsearchSyncService.listIndices();
    }

    @GetMapping("/indices/{index}/fields")
    @Operation(summary = "获取索引字段", description = "根据索引名称返回其可用字段列表")
    public List<Map<String, String>> listIndexFields(@PathVariable String index) throws IOException {
        return elasticsearchSyncService.listIndexFields(index);
    }

    @GetMapping("/indices/{index}/fields/filtered")
    @Operation(summary = "获取过滤后的索引字段", description = "根据索引名称和字段类型过滤器返回字段列表。fieldType可选值: 'numeric'(仅数值字段), 'text'(仅文本字段), 'all'(所有字段)")
    public List<Map<String, String>> listIndexFieldsFiltered(
            @PathVariable String index,
            @RequestParam(defaultValue = "all") String fieldType) throws IOException {
        return elasticsearchSyncService.listIndexFields(index, fieldType);
    }

    @GetMapping("/assets")
    @Operation(summary = "资产表聚合", description = "在event-*索引中按assetIP聚合，返回每个资产的最小severity(1高/2中/3低)、事件总数与最后发生时间，支持timeRange与filePath过滤")
    public Map<String, Object> getAssets(
            @RequestParam Long startTime,
            @RequestParam Long endTime,
            @RequestParam(required = false) String filePath,
            @RequestParam(defaultValue = "5") Integer size
    ) throws IOException {
        return elasticsearchSyncService.getAssetAggregation(startTime, endTime, filePath, size);
    }

    @GetMapping("/alarms")
    @Operation(summary = "告警表聚合", description = "在event-*索引中按severity->SourceClass->signature聚合，返回每组的最后发生时间，支持timeRange与filePath过滤")
    public Map<String, Object> getAlarms(
            @RequestParam Long startTime,
            @RequestParam Long endTime,
            @RequestParam(required = false) String filePath,
            @RequestParam(defaultValue = "5") Integer size
    ) throws IOException {
        return elasticsearchSyncService.getAlarmAggregation(startTime, endTime, filePath, size);
    }

    @PostMapping("/widget/query")
    @Operation(summary = "Widget数据查询", description = "根据Widget配置(索引/过滤/聚合)返回图表或表格数据, 默认最近7天")
    public Map<String,Object> widgetQuery(@RequestBody WidgetQueryRequest req) throws IOException {
        log.info("Controller received widget query request: {}", req);
        log.info("Controller yField check: '{}'", req.getYField());
        return elasticsearchSyncService.executeWidgetQuery(req);
    }

    // ============ Session-based helper endpoints ============

    @GetMapping("/session/conn-stats")
    @Operation(summary = "根据sessionId统计连接信息", description = "在conn-*索引下, 按filePath=sessionId聚合统计: 文档数(Logs)与平均会话时长(Avg connDuration)")
    public Map<String, Object> getConnStatsBySession(
            @RequestParam String sessionId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "conn-*") String index
    ) throws IOException {
        Query filePathQuery = Query.of(q -> q.match(m -> m.field("filePath").query(sessionId)));

        Query finalQuery = (startTime != null && endTime != null)
                ? Query.of(q -> q.bool(b -> b
                        .must(filePathQuery)
                        .must(m -> m.range(r -> r
                                .field("timestamp")
                                .gte(JsonData.of(startTime))
                                .lte(JsonData.of(endTime))
                        ))
                ))
                : filePathQuery;

    // 使用 count API 获取真实文档总数（避免默认 10,000 的上限）
    var countResp = esClient.count(c -> c
        .index(index)
        .query(finalQuery)
    );
    long logs = countResp != null ? countResp.count() : 0L;

    // 使用一次轻量 search 获取平均会话时长聚合
    var response = esClient.search(s -> s
            .index(index)
            .size(0)
            .query(finalQuery)
            .aggregations("avgDuration", a -> a.avg(v -> v.field("connDuration")))
        , JsonData.class);
        Double avgDuration = null;
        if (response.aggregations() != null && response.aggregations().containsKey("avgDuration")) {
            var avg = response.aggregations().get("avgDuration").avg();
            if (avg != null) {
                double v = avg.value();
                if (!Double.isNaN(v)) {
                    avgDuration = v;
                }
            }
        }

        return Map.of(
                "sessionId", sessionId,
                "logs", logs,
                "avgConnDuration", avgDuration
        );
    }

    @GetMapping("/session/traffic")
    @Operation(summary = "根据sessionId查询流量趋势", description = "在octopusx-data-*索引中按filePath=sessionId过滤, 返回时间序列原始记录(util/pps/bps/port/timestamp)")
    public List<Map<String, Object>> getTrafficBySession(
            @RequestParam String sessionId,
            @RequestParam(defaultValue = "octopusx-data-*") String index,
            @RequestParam(defaultValue = "20") Integer desiredPoints
    ) throws IOException {
        int targetPoints = Math.max(1, Math.min(desiredPoints != null ? desiredPoints : 20, 20));
        Query finalQuery = Query.of(q -> q.match(m -> m.field("filePath").query(sessionId)));

        SearchResponse<JsonData> resp = esClient.search(s -> s
                .index(index)
                .size(1000)
                .query(finalQuery)
                .sort(sort -> sort.field(f -> f.field("timestamp").order(co.elastic.clients.elasticsearch._types.SortOrder.Asc)))
        , JsonData.class);

        java.util.ArrayList<Map<String, Object>> raw = new java.util.ArrayList<>();
        if (resp.hits() != null && resp.hits().hits() != null) {
            for (var h : resp.hits().hits()) {
                var src = h.source();
                if (src != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> record = (Map<String, Object>) src.to(Map.class);
                    raw.add(record);
                }
            }
        }

        // If data is small, return directly
        if (raw.size() <= targetPoints) {
            return raw;
        }

        // Downsample based on time range to approximately desiredPoints
        long minTs = Long.MAX_VALUE;
        long maxTs = Long.MIN_VALUE;
        for (Map<String, Object> r : raw) {
            Object tsv = r.get("timestamp");
            if (tsv == null) continue;
            long t;
            if (tsv instanceof Number) {
                t = ((Number) tsv).longValue();
            } else {
                try {
                    t = java.time.Instant.parse(String.valueOf(tsv)).toEpochMilli();
                } catch (Exception e) {
                    // fallback
                    t = 0L;
                }
            }
            if (t < minTs) minTs = t;
            if (t > maxTs) maxTs = t;
        }
        if (minTs == Long.MAX_VALUE || maxTs == Long.MIN_VALUE || maxTs <= minTs) {
            return raw; // cannot determine range
        }

        long span = maxTs - minTs;
        long bucketMs = Math.max(1L, (long) Math.ceil((double) span / Math.max(1, targetPoints)));

        // port -> bucketStart -> [sumUtil, count, sampleRecordForOtherFields]
        java.util.Map<String, java.util.Map<Long, double[]>> acc = new java.util.HashMap<>();
        java.util.Map<String, java.util.Map<Long, Map<String, Object>>> sample = new java.util.HashMap<>();

        for (Map<String, Object> r : raw) {
            String port = String.valueOf(r.getOrDefault("port", 0));
            Object tsv = r.get("timestamp");
            long t;
            if (tsv instanceof Number) {
                t = ((Number) tsv).longValue();
            } else {
                try {
                    t = java.time.Instant.parse(String.valueOf(tsv)).toEpochMilli();
                } catch (Exception e) {
                    continue;
                }
            }
            long bucket = ((t - minTs) / bucketMs) * bucketMs + minTs;
            double util = 0.0;
            Object u = r.get("util");
            if (u != null) {
                try { util = Double.parseDouble(String.valueOf(u)); } catch (Exception ignore) { util = 0.0; }
            }
            acc.computeIfAbsent(port, k -> new java.util.HashMap<>());
            sample.computeIfAbsent(port, k -> new java.util.HashMap<>());
            double[] sarr = acc.get(port).computeIfAbsent(bucket, k -> new double[]{0.0, 0.0});
            sarr[0] += util;
            sarr[1] += 1.0;
            sample.get(port).putIfAbsent(bucket, r);
        }

        java.util.ArrayList<Map<String, Object>> down = new java.util.ArrayList<>();
        for (var perPort : acc.entrySet()) {
            String port = perPort.getKey();
            java.util.List<Long> buckets = new java.util.ArrayList<>(perPort.getValue().keySet());
            java.util.Collections.sort(buckets);
            for (Long b : buckets) {
                double[] sarr = perPort.getValue().get(b);
                double avg = sarr[1] > 0 ? (sarr[0] / sarr[1]) : 0.0;
                Map<String, Object> r = new java.util.HashMap<>(sample.get(port).get(b));
                r.put("timestamp", b);
                r.put("port", Integer.parseInt(port));
                r.put("util", String.format(java.util.Locale.US, "%.4f", avg));
                down.add(r);
            }
        }

        return down;
    }

    @GetMapping("/session/traffic-trending")
    @Operation(summary = "根据sessionId返回按通道聚合的trending数据", description = "自动查询首末时间，按时间跨度计算合适的间隔，返回每个通道的util趋势，最大约20个点/通道")
    public Map<String, List<TrendingData>> getTrafficTrendingBySession(
            @RequestParam String sessionId,
            @RequestParam(defaultValue = "octopusx-data-*") String index,
            @RequestParam(defaultValue = "20") Integer desiredPoints
    ) throws IOException {
        // 1) 查询首末时间
        Query query = Query.of(q -> q
                .bool(b -> b.must(m -> m.match(t -> t.field("filePath").query(sessionId))))
        );

        SearchResponse<JsonData> firstResp = esClient.search(s -> s
                .index(index)
                .query(query)
                .size(1)
                .sort(sort -> sort.field(f -> f.field("timestamp").order(co.elastic.clients.elasticsearch._types.SortOrder.Asc)))
        , JsonData.class);
        SearchResponse<JsonData> lastResp = esClient.search(s -> s
                .index(index)
                .query(query)
                .size(1)
                .sort(sort -> sort.field(f -> f.field("timestamp").order(co.elastic.clients.elasticsearch._types.SortOrder.Desc)))
        , JsonData.class);

        Long startMs = null;
        Long endMs = null;
        if (!firstResp.hits().hits().isEmpty()) {
            var firstHit = firstResp.hits().hits().get(0);
            var src = firstHit.source();
            if (src != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> m = (Map<String, Object>) src.to(Map.class);
            Object ts = m.get("timestamp");
            try {
                startMs = (ts instanceof Number) ? ((Number) ts).longValue() : java.time.Instant.parse(String.valueOf(ts)).toEpochMilli();
            } catch (Exception ignore) {}
            }
        }
        if (!lastResp.hits().hits().isEmpty()) {
            var lastHit = lastResp.hits().hits().get(0);
            var src2 = lastHit.source();
            if (src2 != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> m = (Map<String, Object>) src2.to(Map.class);
            Object ts = m.get("timestamp");
            try {
                endMs = (ts instanceof Number) ? ((Number) ts).longValue() : java.time.Instant.parse(String.valueOf(ts)).toEpochMilli();
            } catch (Exception ignore) {}
            }
        }

        if (startMs == null || endMs == null || endMs <= startMs) {
            // 没有数据，返回空
            return java.util.Collections.emptyMap();
        }

        // 2) 计算合适的interval，目标点数 desiredPoints（默认20）
        int target = Math.max(1, Math.min(desiredPoints != null ? desiredPoints : 20, 20));
        String interval = autoIntervalFromSpan(endMs - startMs, target);

        // 3) 使用已有带宽趋势方法（按通道util）
        return elasticsearchSyncService.getBandwidthTrends(startMs, endMs, sessionId, interval);
    }

    @GetMapping("/session/event-count")
    @Operation(summary = "根据sessionId统计事件数", description = "在event-*索引下, 按filePath=sessionId统计文档数量")
    public Map<String, Object> getEventCountBySession(
            @RequestParam String sessionId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "event-*") String index
    ) throws IOException {
        Query filePathQuery = Query.of(q -> q.match(m -> m.field("filePath").query(sessionId)));

        Query finalQuery = (startTime != null && endTime != null)
                ? Query.of(q -> q.bool(b -> b
                        .must(filePathQuery)
                        .must(m -> m.range(r -> r
                                .field("timestamp")
                                .gte(JsonData.of(startTime))
                                .lte(JsonData.of(endTime))
                        ))
                ))
                : filePathQuery;

        CountResponse countResp = esClient.count(c -> c
                .index(index)
                .query(finalQuery)
        );

        long count = countResp.count();
        return Map.of(
                "sessionId", sessionId,
                "eventCount", count
        );
    }
}