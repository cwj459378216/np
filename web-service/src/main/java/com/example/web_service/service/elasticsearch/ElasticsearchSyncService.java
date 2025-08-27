package com.example.web_service.service.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.aggregations.CalendarInterval;
import co.elastic.clients.elasticsearch._types.aggregations.StringTermsAggregate;
import co.elastic.clients.elasticsearch._types.aggregations.LongTermsAggregate;
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
        return switch (interval.toUpperCase()) {
            case "MINUTE", "1MIN" -> CalendarInterval.Minute;
            case "HOUR", "1H" -> CalendarInterval.Hour;
            case "DAY", "1D" -> CalendarInterval.Day;
            case "WEEK", "1W" -> CalendarInterval.Week;
            case "MONTH", "1MON" -> CalendarInterval.Month;
            case "QUARTER", "1Q" -> CalendarInterval.Quarter;
            case "YEAR", "1Y" -> CalendarInterval.Year;
            default -> CalendarInterval.Hour;  // 默认使用小时
        };
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
} 