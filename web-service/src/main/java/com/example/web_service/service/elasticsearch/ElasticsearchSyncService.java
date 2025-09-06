package com.example.web_service.service.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.aggregations.CalendarInterval;
import co.elastic.clients.util.NamedValue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import co.elastic.clients.json.JsonData;
import com.example.web_service.model.es.ConnRecord;
import com.example.web_service.model.es.TrendingData;
import java.util.Optional;

@Service
public class ElasticsearchSyncService {
    private static final Logger log = LoggerFactory.getLogger(ElasticsearchSyncService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private ElasticsearchClient esClient;

    public <T> SearchResponse<T> search(SearchRequest request, Class<T> tClass) throws IOException {
        return esClient.search(request, tClass);
    }

    public <T> List<T> searchList(String index, Query query, Class<T> tClass) throws IOException {
        SearchResponse<T> response = esClient.search(s -> s
                .index(index)
                .query(query), 
                tClass
        );
        return response.hits().hits().stream()
                .map(hit -> hit.source())
                .filter(source -> source != null)
                .toList();
    }

    public List<Map<String, Object>> searchRaw(String index, Query query) throws IOException {
        SearchResponse<JsonData> response = esClient.search(s -> s
                .index(index)
                .query(query)
                .size(100),
                JsonData.class
        );
        
        return response.hits().hits().stream()
                .map(hit -> hit.source())
                .filter(source -> source != null)
                .map(source -> {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> result = source.to(Map.class);
                    return result;
                })
                .filter(source -> source != null)
                .collect(Collectors.toList());
    }

    public List<ConnRecord> searchConnRecords(String index, Query query) throws IOException {
        SearchResponse<ConnRecord> response = esClient.search(s -> s
                .index(index)
                .query(query)
                .size(100),
                ConnRecord.class
        );
        
        return response.hits().hits().stream()
                .map(hit -> hit.source())
                .filter(source -> source != null)
                .toList();
    }

    private CalendarInterval parseInterval(String interval) {
        switch (interval.toUpperCase()) {
            case "MINUTE":
            case "1MIN":
                return CalendarInterval.Minute;
            case "HOUR":
            case "1H":
                return CalendarInterval.Hour;
            case "DAY":
            case "1D":
                return CalendarInterval.Day;
            case "WEEK":
            case "1W":
                return CalendarInterval.Week;
            case "MONTH":
            case "1MON":
                return CalendarInterval.Month;
            case "QUARTER":
            case "1Q":
                return CalendarInterval.Quarter;
            case "YEAR":
            case "1Y":
                return CalendarInterval.Year;
            default:
                return CalendarInterval.Hour;  // 默认使用小时
        }
    }

    public List<TrendingData> getTrending(String startTime, String endTime, String filePath, String index, String interval) throws IOException {
        // 构建查询条件
        var rangeQuery = new Query.Builder()
            .range(r -> r
                .field("timestamp")
                .gte(JsonData.of(startTime))
                .lte(JsonData.of(endTime))
            );

        // 如果指定了filePath，添加过滤条件
        var query = filePath != null
            ? Query.of(q -> q
                .bool(b -> b
                    .must(rangeQuery.build())
                    .must(m -> m
                        .match(t -> t
                            .field("filePath")
                            .query(filePath)
                        )
                    )
                )
            )
            : Query.of(q -> q
                .bool(b -> b
                    .must(rangeQuery.build())
                )
            );

        // 打印原始查询条件
        log.info("Query DSL: {}", query.toString());
        log.info("Query JSON: {}", objectMapper.writeValueAsString(query));
        
        // 打印Kibana可运行的查询语句
        log.info("=== Kibana Query for Trending ===");
        log.info("GET /{}/_search", index);
        log.info("Content-Type: application/json");
        log.info("");
        log.info("{}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
            "size", 0,
            "query", query,
            "aggs", Map.of(
                "trend", Map.of(
                    "date_histogram", Map.of(
                        "field", "timestamp",
                        "calendar_interval", interval,
                        "format", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
                    )
                )
            )
        )));
        log.info("=== End Kibana Query ===");

        // 创建完整的搜索请求
        var searchRequest = SearchRequest.of(s -> s
                .index(index)
                .size(0)
                .query(query)
                .aggregations("trend", a -> a
                    .dateHistogram(h -> h
                        .field("timestamp")
                        .calendarInterval(parseInterval(interval))
                        .format("yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
                    )
                )
        );

        // 打印完整的搜索请求
        log.info("Complete Search Request: {}", searchRequest.toString());
        log.info("Complete Search Request JSON: {}", objectMapper.writeValueAsString(Map.of(
            "index", index,
            "size", 0,
            "query", Map.of(
                "bool", Map.of(
                    "must", List.of(
                        Map.of(
                            "range", Map.of(
                                "timestamp", Map.of(
                                    "gte", startTime,
                                    "lte", endTime
                                )
                            )
                        )
                    )
                )
            ),
            "aggs", Map.of(
                "trend", Map.of(
                    "date_histogram", Map.of(
                        "field", "timestamp",
                        "calendar_interval", interval,
                        "format", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
                    )
                )
            )
        )));
        log.info("Complete Search Request Pretty JSON: {}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
            "index", index,
            "size", 0,
            "query", Map.of(
                "bool", Map.of(
                    "must", List.of(
                        Map.of(
                            "range", Map.of(
                                "timestamp", Map.of(
                                    "gte", startTime,
                                    "lte", endTime
                                )
                            )
                        )
                    )
                )
            ),
            "aggs", Map.of(
                "trend", Map.of(
                    "date_histogram", Map.of(
                        "field", "timestamp",
                        "calendar_interval", interval,
                        "format", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
                    )
                )
            )
        )));
        log.info("Search Request Details - Index: {}, Size: 0, Interval: {}, Aggregations: trend date_histogram on 'timestamp'", index, interval);

        // 执行查询
        var response = esClient.search(searchRequest, Void.class);

        // 打印响应
        log.info("ES Response: {}", objectMapper.writeValueAsString(response));
        log.info("ES Response Took: {}ms", response.took());
        log.info("ES Response Total Hits: {}", response.hits().total() != null ? response.hits().total().value() : 0);
  

        if (response.aggregations() == null) {
            log.warn("No aggregations in response");
            return List.of();
        }

        // 处理结果
        var aggs = response.aggregations();
        var trend = aggs.get("trend");
        if (trend == null) {
            log.warn("No trend aggregation found");
            return List.of();
        }

        var buckets = trend.dateHistogram().buckets().array();
        log.info("Found {} buckets in trend aggregation", buckets.size());

        var result = buckets.stream()
                .map(bucket -> {
                    var trendData = new TrendingData(
                        bucket.key(),
                        bucket.docCount()
                    );
                    log.debug("Bucket: timestamp={}, count={}", 
                        bucket.key(), bucket.docCount());
                    return trendData;
                })
                .collect(Collectors.toList());

        log.info("Trending result size: {}", result.size());
        return result;
    }

    public Map<String, Object> searchRawWithPagination(String index, Query query, Integer size, Integer from) throws IOException {
        SearchResponse<JsonData> response = esClient.search(s -> s
                .index(index)
                .query(query)
                .size(size)
                .from(from)
                .sort(sort -> sort
                    .field(f -> f
                        .field("timestamp")
                        .order(co.elastic.clients.elasticsearch._types.SortOrder.Desc)
                    )
                ),
                JsonData.class
        );
        
        log.info("ES Query: {}", objectMapper.writeValueAsString(response.toString()));
        
        // 打印Kibana可运行的查询语句
        log.info("=== Kibana Query for Raw Search ===");
        log.info("GET /{}/_search", index);
        log.info("Content-Type: application/json");
        log.info("");
        log.info("{}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
            "size", size,
            "from", from,
            "query", query,
            "sort", List.of(Map.of(
                "timestamp", Map.of(
                    "order", "desc"
                )
            ))
        )));
        log.info("=== End Kibana Query ===");
        
        List<Map<String, Object>> hits = response.hits().hits().stream()
                .map(hit -> hit.source())
                .filter(source -> source != null)
                .map(source -> {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> result = source.to(Map.class);
                    return result;
                })
                .filter(source -> source != null)
                .collect(Collectors.toList());

        long total = Optional.ofNullable(response.hits())
                .map(h -> h.total())
                .map(t -> t.value())
                .orElse(0L);

        return Map.of(
            "total", total,
            "hits", hits
        );
    }

    public Map<String, List<TrendingData>> getProtocolTrends(Long startTime, Long endTime, String interval) throws IOException {
        Map<String, List<TrendingData>> result = new java.util.HashMap<>();
        
        // 将时间戳转换为ISO字符串格式
        String startTimeStr = java.time.Instant.ofEpochMilli(startTime).toString();
        String endTimeStr = java.time.Instant.ofEpochMilli(endTime).toString();
        
        // HTTP趋势 - 从http-realtime索引获取
        List<TrendingData> httpTrends = getTrending(startTimeStr, endTimeStr, null, "http-realtime", interval);
        result.put("HTTP", httpTrends);
        
        // DNS趋势 - 从dns-realtime索引获取
        List<TrendingData> dnsTrends = getTrending(startTimeStr, endTimeStr, null, "dns-realtime", interval);
        result.put("DNS", dnsTrends);
        
        // Others趋势 - 合并smb_cmd-realtime和conn-realtime索引的数据
        List<TrendingData> smbTrends = getTrending(startTimeStr, endTimeStr, null, "smb_cmd-realtime", interval);
        List<TrendingData> connTrends = getTrending(startTimeStr, endTimeStr, null, "conn-realtime", interval);
        
        // 合并Others数据 - 将smb和conn的数据合并
        List<TrendingData> othersTrends = mergeOthersTrends(smbTrends, connTrends);
        result.put("Others", othersTrends);
        
        return result;
    }

    public Map<String, List<TrendingData>> getBandwidthTrends(Long startTime, Long endTime, String interval) throws IOException {
        Map<String, List<TrendingData>> result = new java.util.HashMap<>();
        
        // 将时间戳转换为ISO字符串格式
        String startTimeStr = java.time.Instant.ofEpochMilli(startTime).toString();
        String endTimeStr = java.time.Instant.ofEpochMilli(endTime).toString();
        
        log.info("Getting bandwidth trends for time range: {} to {}, interval: {}", startTimeStr, endTimeStr, interval);
        
        // 首先获取所有可用的port/channel
        Set<Integer> availablePorts = getAvailablePorts(startTimeStr, endTimeStr, "octopusx-data");
        log.info("Found {} available ports: {}", availablePorts.size(), availablePorts);
        
        // 为每个port/channel获取趋势数据
        for (Integer port : availablePorts) {
            log.info("Processing bandwidth trends for port: {}", port);
            List<TrendingData> channelTrends = getBandwidthTrending(startTimeStr, endTimeStr, port, "octopusx-data", interval);
            result.put("channel" + port, channelTrends);
            log.info("Got {} data points for port {}", channelTrends.size(), port);
        }
        
        log.info("Bandwidth trends result contains {} channels", result.size());
        return result;
    }

    /**
     * 从 conn-realtime 索引聚合 protoName 的时间序列趋势
     */
    public Map<String, List<TrendingData>> getConnProtocolNameTrends(Long startTime, Long endTime, String interval) throws IOException {
        // 将时间戳转换为ISO字符串格式
        String startTimeStr = java.time.Instant.ofEpochMilli(startTime).toString();
        String endTimeStr = java.time.Instant.ofEpochMilli(endTime).toString();

        // 仅时间范围过滤
        var rangeQuery = new Query.Builder()
            .range(r -> r
                .field("timestamp")
                .gte(JsonData.of(startTimeStr))
                .lte(JsonData.of(endTimeStr))
            );

        var query = Query.of(q -> q
            .bool(b -> b
                .must(rangeQuery.build())
            )
        );

        // 构建 date_histogram + terms 子聚合
        var searchRequest = SearchRequest.of(s -> s
            .index("conn-realtime")
            .size(0)
            .query(query)
            .aggregations("trend", a -> a
                .dateHistogram(h -> h
                    .field("timestamp")
                    .calendarInterval(parseInterval(interval))
                    .format("yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
                )
                .aggregations("by_proto", t -> t
                    .terms(tt -> tt
                        .field("protoName")
                        .size(20)
                    )
                )
            )
        );

        log.info("Conn protocol trends request: start={}, end={}, interval={}", startTimeStr, endTimeStr, interval);
        var response = esClient.search(searchRequest, Void.class);

        Map<String, java.util.Map<Long, Long>> seriesMap = new java.util.HashMap<>();

        var trendAgg = response.aggregations().get("trend");
        if (trendAgg == null || trendAgg.dateHistogram() == null) {
            return java.util.Collections.emptyMap();
        }

        var buckets = trendAgg.dateHistogram().buckets().array();

        for (var bucket : buckets) {
            long ts = bucket.key();
            var protoAgg = bucket.aggregations().get("by_proto");
            if (protoAgg == null || protoAgg.sterms() == null) continue;
            var protoBuckets = protoAgg.sterms().buckets().array();
            for (var pb : protoBuckets) {
                String proto = pb.key().stringValue();
                long count = pb.docCount();
                seriesMap.computeIfAbsent(proto, k -> new java.util.HashMap<>()).put(ts, count);
            }
        }

        // 转换为 Map<String, List<TrendingData>> 并按时间排序
        Map<String, List<TrendingData>> result = new java.util.HashMap<>();
        for (var entry : seriesMap.entrySet()) {
            String proto = entry.getKey();
            var tsMap = entry.getValue();
            var list = tsMap.entrySet().stream()
                .sorted(java.util.Map.Entry.comparingByKey())
                .map(e -> new TrendingData(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
            result.put(proto.toUpperCase(), list);
        }

        return result;
    }

    private List<TrendingData> mergeOthersTrends(List<TrendingData> smbTrends, List<TrendingData> connTrends) {
        Map<Long, TrendingData> mergedMap = new java.util.HashMap<>();
        
        // 添加SMB数据
        for (TrendingData smb : smbTrends) {
            mergedMap.put(smb.getTimestamp(), smb);
        }
        
        // 合并CONN数据
        for (TrendingData conn : connTrends) {
            Long timestamp = conn.getTimestamp();
            if (mergedMap.containsKey(timestamp)) {
                // 如果时间戳已存在，合并count
                TrendingData existing = mergedMap.get(timestamp);
                TrendingData merged = new TrendingData();
                merged.setTimestamp(timestamp);
                merged.setCount(existing.getCount() + conn.getCount());
                mergedMap.put(timestamp, merged);
            } else {
                // 如果时间戳不存在，直接添加
                mergedMap.put(timestamp, conn);
            }
        }
        
        // 转换为List并按时间戳排序
        return mergedMap.values().stream()
                .sorted((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()))
                .collect(Collectors.toList());
    }

    private Set<Integer> getAvailablePorts(String startTime, String endTime, String index) throws IOException {
        // 构建查询条件 - 只包含时间范围
        var rangeQuery = new Query.Builder()
            .range(r -> r
                .field("timestamp")
                .gte(JsonData.of(startTime))
                .lte(JsonData.of(endTime))
            );

        var query = Query.of(q -> q
            .bool(b -> b
                .must(rangeQuery.build())
            )
        );


        // 创建搜索请求，聚合port字段
        var searchRequest = SearchRequest.of(s -> s
                .index(index)
                .size(0)
                .query(query)
                .aggregations("ports", a -> a
                    .terms(t -> t
                        .field("port")
                        .size(100) // 获取最多100个不同的port
                    )
                )
        );

                // 打印完整的搜索请求
        log.info("Port Search Request JSON: {}", objectMapper.writeValueAsString(Map.of(
            "index", index,
            "size", 0,
            "query", Map.of(
                "bool", Map.of(
                    "must", List.of(
                        Map.of(
                            "range", Map.of(
                                "timestamp", Map.of(
                                    "gte", startTime,
                                    "lte", endTime
                                )
                            )
                        )
                    )
                )
            ),
            "aggs", Map.of(
                "ports", Map.of(
                    "terms", Map.of(
                        "field", "port",
                        "size", 100
                    )
                )
            )
        )));
        log.info("Port Search Request Pretty JSON: {}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
            "index", index,
            "size", 0,
            "query", Map.of(
                "bool", Map.of(
                    "must", List.of(
                        Map.of(
                            "range", Map.of(
                                "timestamp", Map.of(
                                    "gte", startTime,
                                    "lte", endTime
                                )
                            )
                        )
                    )
                )
            ),
            "aggs", Map.of(
                "ports", Map.of(
                    "terms", Map.of(
                        "field", "port",
                        "size", 100
                    )
                )
            )
        )));
        log.info("Port Search Request - Index: {}, Size: 0, Aggregations: ports terms on field 'port'", index);

        // 执行查询
        var response = esClient.search(searchRequest, Void.class);

        // 打印响应
        log.info("ES Response for ports query: {}", objectMapper.writeValueAsString(response));
        log.info("ES Response Took for ports query: {}ms", response.took());
        log.info("ES Response Total Hits for ports query: {}", response.hits().total() != null ? response.hits().total().value() : 0);

        if (response.aggregations() == null) {
            log.warn("No aggregations in port query response");
            return Set.of();
        }

        // 处理结果
        var aggs = response.aggregations();
        var ports = aggs.get("ports");
        if (ports == null) {
            log.warn("No ports aggregation found");
            return Set.of();
        }

        var longTerms = ports.lterms();
        var buckets = longTerms.buckets().array();
        log.info("Found {} different ports", buckets.size());
        
        Set<Integer> portSet = buckets.stream()
                .map(bucket -> (int) bucket.key())
                .collect(Collectors.toSet());
        
        log.info("Port buckets details:");
        buckets.forEach(bucket -> {
            log.info("  Port: {}, Doc Count: {}", bucket.key(), bucket.docCount());
        });
        
        log.info("Final port set: {}", portSet);
        return portSet;
    }

    private List<TrendingData> getBandwidthTrending(String startTime, String endTime, int port, String index, String interval) throws IOException {
        // 构建查询条件 - 包含时间范围和port过滤
        var rangeQuery = new Query.Builder()
            .range(r -> r
                .field("timestamp")
                .gte(JsonData.of(startTime))
                .lte(JsonData.of(endTime))
            );

        var portQuery = new Query.Builder()
            .term(t -> t
                .field("port")
                .value(port)
            );

        var query = Query.of(q -> q
            .bool(b -> b
                .must(rangeQuery.build())
                .must(portQuery.build())
            )
        );

        // 打印原始查询条件
        log.info("Bandwidth Query DSL for port {}: {}", port, query.toString());
        log.info("Bandwidth Query JSON for port {}: {}", port, objectMapper.writeValueAsString(query));
        
        // 打印Kibana可运行的查询语句
        log.info("=== Kibana Query for Bandwidth Port {} ===", port);
        log.info("GET /octopusx-data/_search");
        log.info("Content-Type: application/json");
        log.info("");
        log.info("{}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
            "size", 0,
            "query", query,
            "aggs", Map.of(
                "trend", Map.of(
                    "date_histogram", Map.of(
                        "field", "timestamp",
                        "calendar_interval", interval,
                        "format", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
                    ),
                    "aggs", Map.of(
                        "avg_util", Map.of(
                            "avg", Map.of(
                                "field", "util"
                            )
                        )
                    )
                )
            )
        )));
        log.info("=== End Kibana Query ===");

        // 创建完整的搜索请求
        var searchRequest = SearchRequest.of(s -> s
                .index(index)
                .size(0)
                .query(query)
                .aggregations("trend", a -> a
                    .dateHistogram(h -> h
                        .field("timestamp")
                        .calendarInterval(parseInterval(interval))
                        .format("yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
                    )
                    .aggregations("avg_util", avg -> avg
                        .avg(av -> av
                            .field("util")
                        )
                    )
                )
        );

        // 打印完整的搜索请求
        log.info("Bandwidth Search Request JSON for port {}: {}", port, objectMapper.writeValueAsString(Map.of(
            "index", index,
            "size", 0,
            "query", Map.of(
                "bool", Map.of(
                    "must", List.of(
                        Map.of(
                            "range", Map.of(
                                "timestamp", Map.of(
                                    "gte", startTime,
                                    "lte", endTime
                                )
                            )
                        ),
                        Map.of(
                            "term", Map.of(
                                "port", Map.of(
                                    "value", port
                                )
                            )
                        )
                    )
                )
            ),
            "aggs", Map.of(
                "trend", Map.of(
                    "date_histogram", Map.of(
                        "field", "timestamp",
                        "calendar_interval", interval,
                        "format", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
                    ),
                    "aggs", Map.of(
                        "avg_util", Map.of(
                            "avg", Map.of(
                                "field", "util"
                            )
                        )
                    )
                )
            )
        )));
        log.info("Bandwidth Search Request Pretty JSON for port {}: {}", port, objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
            "index", index,
            "size", 0,
            "query", Map.of(
                "bool", Map.of(
                    "must", List.of(
                        Map.of(
                            "range", Map.of(
                                "timestamp", Map.of(
                                    "gte", startTime,
                                    "lte", endTime
                                )
                            )
                        ),
                        Map.of(
                            "term", Map.of(
                                "port", Map.of(
                                    "value", port
                                )
                            )
                        )
                    )
                )
            ),
            "aggs", Map.of(
                "trend", Map.of(
                    "date_histogram", Map.of(
                        "field", "timestamp",
                        "calendar_interval", interval,
                        "format", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
                    ),
                    "aggs", Map.of(
                        "avg_util", Map.of(
                            "avg", Map.of(
                                "field", "util"
                            )
                        )
                    )
                )
            )
        )));
        log.info("Bandwidth Search Request for port {} - Index: {}, Size: 0, Interval: {}, Aggregations: trend date_histogram on 'timestamp' with avg_util avg on 'util'", port, index, interval);

        // 执行查询
        var response = esClient.search(searchRequest, Void.class);

        // 打印响应
        log.info("ES Response for port {}: {}", port, objectMapper.writeValueAsString(response));
        log.info("ES Response Took for port {}: {}ms", port, response.took());
        log.info("ES Response Total Hits for port {}: {}", port, response.hits().total() != null ? response.hits().total().value() : 0);

        if (response.aggregations() == null) {
            log.warn("No aggregations in bandwidth response for port {}", port);
            return List.of();
        }

        // 处理结果
        var aggs = response.aggregations();
        var trend = aggs.get("trend");
        if (trend == null) {
            log.warn("No trend aggregation found in bandwidth response for port {}", port);
            return List.of();
        }

        var buckets = trend.dateHistogram().buckets().array();
        log.info("Found {} buckets in bandwidth trend aggregation for port {}", buckets.size(), port);

        var result = buckets.stream()
                .map(bucket -> {
                    // 获取平均利用率
                    var avgUtil = bucket.aggregations().get("avg_util");
                    double avgUtilValue = 0.0;
                    if (avgUtil != null && avgUtil.avg() != null) {
                        avgUtilValue = avgUtil.avg().value();
                    }
                    
                    var trendData = new TrendingData();
                    trendData.setTimestamp(bucket.key());
                    trendData.setCount((long) (avgUtilValue * 100)); // 转换为百分比
                    
                    log.info("Bandwidth Bucket for port {}: timestamp={}, avg_util={}, doc_count={}", 
                        port, bucket.key(), avgUtilValue, bucket.docCount());
                    return trendData;
                })
                .collect(Collectors.toList());

        log.info("Bandwidth trending result size for port {}: {}", port, result.size());
        log.info("Bandwidth trending result for port {}: {}", port, result);
        return result;
    }

    /**
     * 获取serviceName字段的聚合统计数据
     * @param topN 返回Top N的数据条数
     * @return 聚合结果
     * @throws IOException
     */
    public Map<String, Object> getServiceNameAggregation(Integer topN) throws IOException {
        return getServiceNameAggregation(topN, null, null);
    }

    /**
     * 获取serviceName字段的聚合统计数据（支持时间范围过滤）
     * @param topN 返回Top N的数据条数
     * @param startTime 开始时间戳（毫秒）
     * @param endTime 结束时间戳（毫秒）
     * @return 聚合结果
     * @throws IOException
     */
    public Map<String, Object> getServiceNameAggregation(Integer topN, Long startTime, Long endTime) throws IOException {
        log.info("Getting serviceName aggregation with topN: {}, startTime: {}, endTime: {}", topN, startTime, endTime);
        String[] possibleFields = {"serviceName", "protoName", "serviceName.keyword", "protoName.keyword"};
        for (String field : possibleFields) {
            try {
                log.info("Trying field: {}", field);
                SearchRequest.Builder searchRequestBuilder = new SearchRequest.Builder()
                    .index("conn-realtime")
                    .size(0);
                boolean hasTimeRange = false;
                if (startTime != null && endTime != null) {
                    hasTimeRange = true;
                    log.info("Adding time range filter: {} to {}", startTime, endTime);
                    searchRequestBuilder.query(q -> q
                        .range(r -> r
                            .field("timestamp")
                            .gte(JsonData.of(startTime))
                            .lte(JsonData.of(endTime))
                        )
                    );
                }
                var searchRequest = searchRequestBuilder
                    .aggregations("service_names", a -> a
                        .terms(t -> t
                            .field(field)
                            .size(topN)
                            .order(List.of(NamedValue.of("_count", co.elastic.clients.elasticsearch._types.SortOrder.Desc)))
                        )
                    )
                    .build();

                // 打印完整查询（便于直接在 Kibana Console 中粘贴执行）
                java.util.Map<String, Object> kibanaQuery = new java.util.HashMap<>();
                kibanaQuery.put("size", 0);
                if (hasTimeRange) {
                    kibanaQuery.put("query", java.util.Map.of(
                        "range", java.util.Map.of(
                            "timestamp", java.util.Map.of(
                                "gte", startTime,
                                "lte", endTime
                            )
                        )
                    ));
                }
                kibanaQuery.put("aggs", java.util.Map.of(
                    "service_names", java.util.Map.of(
                        "terms", java.util.Map.of(
                            "field", field,
                            "size", topN,
                            "order", java.util.Map.of("_count", "desc")
                        )
                    )
                ));
                log.info("=== Full ES Query (Kibana Console) ===");
                log.info("GET /conn-realtime/_search");
                // 修复日志输出的字符串格式
                log.info("{}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(kibanaQuery));
                log.info("=== End ES Query ===");

                var response = esClient.search(searchRequest, Map.class);
                log.info("ServiceName aggregation search completed for field: {}", field);
                if (response.aggregations() == null) {
                    log.warn("No aggregations in serviceName response for field: {}", field);
                    continue;
                }
                var serviceNamesAgg = response.aggregations().get("service_names");
                if (serviceNamesAgg == null || serviceNamesAgg.sterms() == null) {
                    log.warn("No service_names aggregation found for field: {}", field);
                    continue;
                }
                var buckets = serviceNamesAgg.sterms().buckets().array();
                log.info("Found {} buckets in serviceName aggregation for field: {}", buckets.size(), field);
                if (buckets.isEmpty()) {
                    log.warn("No buckets found for field: {}, trying next field", field);
                    continue;
                }
                Map<String, Object> result = new java.util.HashMap<>();
                List<Map<String, Object>> data = new java.util.ArrayList<>();
                for (int i = 0; i < buckets.size(); i++) {
                    var bucket = buckets.get(i);
                    String serviceName;
                    var keyValue = bucket.key();
                    try {
                        if (keyValue.isString()) {
                            serviceName = keyValue.stringValue();
                        } else if (keyValue.isLong()) {
                            serviceName = String.valueOf(keyValue.longValue());
                        } else if (keyValue.isDouble()) {
                            serviceName = String.valueOf(keyValue.doubleValue());
                        } else if (keyValue.isBoolean()) {
                            serviceName = String.valueOf(keyValue.booleanValue());
                        } else {
                            String jsonStr = objectMapper.writeValueAsString(keyValue);
                            if (jsonStr.startsWith("\"") && jsonStr.endsWith("\"")) {
                                serviceName = jsonStr.substring(1, jsonStr.length() - 1);
                            } else {
                                serviceName = jsonStr;
                            }
                        }
                        log.info("Extracted serviceName: '{}' from bucket key for field: {}", serviceName, field);
                    } catch (Exception e) {
                        log.warn("Error extracting service name from bucket key for field {}: {}", field, e.getMessage());
                        serviceName = keyValue.toString();
                        if (serviceName.contains("@")) {
                            log.warn("Failed to extract meaningful value from FieldValue for field {}, skipping", field);
                            continue;
                        }
                    }
                    if (serviceName == null || serviceName.trim().isEmpty() || "null".equals(serviceName) || serviceName.contains("@") || "-".equals(serviceName.trim())) {
                        log.warn("Skipping invalid service name: '{}' for field: {}", serviceName, field);
                        continue;
                    }
                    Map<String, Object> item = new java.util.HashMap<>();
                    item.put("serviceName", serviceName); // 直接使用聚合结果原值
                    item.put("count", bucket.docCount());
                    item.put("rank", data.size() + 1);
                    data.add(item);
                    log.info("ServiceName bucket {}: name='{}', count={}, field={}", data.size(), serviceName, bucket.docCount(), field);
                    if (data.size() >= topN) {
                        break; // 已达到请求的数量
                    }
                }
                if (!data.isEmpty()) {
                    result.put("data", data);
                    result.put("total", data.size());
                    result.put("field", field);
                    log.info("ServiceName aggregation result: {} items using field: {}", data.size(), field);
                    return result;
                } else {
                    log.warn("No valid data found for field: {}, trying next field", field);
                }
            } catch (Exception e) {
                log.warn("Error querying field {}: {}, trying next field", field, e.getMessage());
                e.printStackTrace();
            }
        }
        log.warn("All fields failed, returning default data");
        return getDefaultServiceNameData(topN);
    }
    
    /**
     * 返回默认的ServiceName数据
     */
    private Map<String, Object> getDefaultServiceNameData(Integer topN) {
        // 不再返回模拟默认数据，直接返回空结果
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("data", java.util.Collections.emptyList());
        result.put("total", 0);
        result.put("field", "none");
        log.info("No serviceName aggregation available, returning empty data");
        return result;
    }
}