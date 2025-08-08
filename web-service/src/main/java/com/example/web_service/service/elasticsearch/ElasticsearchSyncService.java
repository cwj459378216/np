package com.example.web_service.service.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.aggregations.CalendarInterval;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
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

        // 执行查询
        var response = esClient.search(searchRequest, Void.class);

        // 打印响应
        log.info("ES Response: {}", objectMapper.writeValueAsString(response));
  

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
} 