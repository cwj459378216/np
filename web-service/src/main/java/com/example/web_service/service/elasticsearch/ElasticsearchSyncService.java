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
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import co.elastic.clients.json.JsonData;
import co.elastic.clients.elasticsearch.cat.aliases.AliasesRecord;
import co.elastic.clients.elasticsearch._types.mapping.Property;
import com.example.web_service.model.es.ConnRecord;
import com.example.web_service.model.es.TrendingData;
import com.example.web_service.model.es.widget.WidgetQueryRequest;
import com.example.web_service.model.es.widget.WidgetFilter;
import java.util.Optional;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch.core.DeleteByQueryResponse;
import co.elastic.clients.elasticsearch.core.DeleteByQueryRequest;
import co.elastic.clients.elasticsearch._types.Conflicts;

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

        // 执行查询
        var response = esClient.search(searchRequest, Void.class);

        long totalHits = 0L;
        try {
            var hits = response.hits();
            var totalObj = (hits != null) ? hits.total() : null;
            if (totalObj != null) {
                totalHits = totalObj.value();
            }
        } catch (Exception ignore) {}

        if (response.aggregations() == null) {
            return List.of();
        }

        // 处理结果
        var aggs = response.aggregations();
        var trend = aggs.get("trend");
        if (trend == null) {
            return List.of();
        }

        var buckets = trend.dateHistogram().buckets().array();

        var result = buckets.stream()
                .map(bucket -> {
                    var trendData = new TrendingData(
                        bucket.key(),
                        bucket.docCount()
                    );
                    return trendData;
                })
                .collect(Collectors.toList());

        return result;
    }

    public Map<String, Object> searchRawWithPagination(String index, Query query, Integer size, Integer from) throws IOException {
        // 构建SearchRequest
        SearchRequest searchRequest = SearchRequest.of(s -> s
                .index(index)
                .query(query)
                .size(size)
                .from(from)
                .sort(sort -> sort
                    .field(f -> f
                        .field("timestamp")
                        .order(co.elastic.clients.elasticsearch._types.SortOrder.Desc)
                    )
                )
        );
        
        // 输出请求日志
        try {
            String requestString = searchRequest.toString();
            log.debug("Elasticsearch SearchRequest: {}", requestString);
        } catch (Exception e) {
            log.warn("Failed to serialize SearchRequest for logging: {}", e.getMessage());
        }
        
        SearchResponse<JsonData> response = esClient.search(searchRequest, JsonData.class);
        
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

    public Map<String, List<TrendingData>> getProtocolTrends(Long startTime, Long endTime, String filePath, String interval) throws IOException {
        Map<String, List<TrendingData>> result = new java.util.HashMap<>();
        
        // 将时间戳转换为ISO字符串格式
        String startTimeStr = java.time.Instant.ofEpochMilli(startTime).toString();
        String endTimeStr = java.time.Instant.ofEpochMilli(endTime).toString();
        
        // HTTP趋势 - 从http-realtime索引获取
        List<TrendingData> httpTrends = getTrending(startTimeStr, endTimeStr, filePath, "http-*", interval);
        result.put("HTTP", httpTrends);
        
        // DNS趋势 - 从dns-realtime索引获取
        List<TrendingData> dnsTrends = getTrending(startTimeStr, endTimeStr, filePath, "dns-*", interval);
        result.put("DNS", dnsTrends);
        
        // Others趋势 - 合并smb_cmd-realtime和conn-realtime索引的数据
        List<TrendingData> smbTrends = getTrending(startTimeStr, endTimeStr, filePath, "smb_cmd-*", interval);
        List<TrendingData> connTrends = getTrending(startTimeStr, endTimeStr, filePath, "conn-*", interval);
        
        // 合并Others数据 - 将smb和conn的数据合并
        List<TrendingData> othersTrends = mergeOthersTrends(smbTrends, connTrends);
        result.put("Others", othersTrends);
        
        return result;
    }

    public Map<String, List<TrendingData>> getBandwidthTrends(Long startTime, Long endTime, String filePath, String interval) throws IOException {
        Map<String, List<TrendingData>> result = new java.util.HashMap<>();
        
        // 将时间戳转换为ISO字符串格式
        String startTimeStr = java.time.Instant.ofEpochMilli(startTime).toString();
        String endTimeStr = java.time.Instant.ofEpochMilli(endTime).toString();
        
    // 首先获取所有可用的port/channel（可选 filePath 过滤，索引用通配）
    Set<Integer> availablePorts = getAvailablePortsWithFilter(startTimeStr, endTimeStr, "octopusx-data-*", filePath);
        
        // 为每个port/channel获取趋势数据
        for (Integer port : availablePorts) {
            List<TrendingData> channelTrends = getBandwidthTrendingWithFilter(startTimeStr, endTimeStr, port, "octopusx-data-*", interval, filePath);
            result.put("channel" + port, channelTrends);
        }
        
        return result;
    }

    /**
     * 从 conn-realtime 索引聚合 protoName 的时间序列趋势
     */
    public Map<String, List<TrendingData>> getConnProtocolNameTrends(Long startTime, Long endTime, String filePath, String interval) throws IOException {
        // 将时间戳转换为ISO字符串格式
        String startTimeStr = java.time.Instant.ofEpochMilli(startTime).toString();
        String endTimeStr = java.time.Instant.ofEpochMilli(endTime).toString();

        // 构建查询条件
        var rangeQuery = new Query.Builder()
            .range(r -> r
                .field("timestamp")
                .gte(JsonData.of(startTimeStr))
                .lte(JsonData.of(endTimeStr))
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

        // 构建 date_histogram + terms 子聚合
        var searchRequest = SearchRequest.of(s -> s
            .index("conn-*")
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

    @SuppressWarnings("unused")
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

        // 执行查询
        var response = esClient.search(searchRequest, Void.class);

        long portsTotal = 0L;
        try {
            var hits = response.hits();
            var totalObj = (hits != null) ? hits.total() : null;
            if (totalObj != null) {
                portsTotal = totalObj.value();
            }
        } catch (Exception ignore) {}

        if (response.aggregations() == null) {
            return Set.of();
        }

        // 处理结果
        var aggs = response.aggregations();
        var ports = aggs.get("ports");
        if (ports == null) {
            return Set.of();
        }

        // 检查聚合结果的类型，支持 Long 和 String 类型
        Set<Integer> portSet = new java.util.HashSet<>();
        try {
            // 尝试作为 Long terms 处理
            var longTerms = ports.lterms();
            var buckets = longTerms.buckets().array();
            portSet = buckets.stream()
                    .map(bucket -> (int) bucket.key())
                    .collect(Collectors.toSet());
        } catch (IllegalStateException e) {
            try {
                // 如果失败，尝试作为 String terms 处理
                var stringTerms = ports.sterms();
                var buckets = stringTerms.buckets().array();
                portSet = buckets.stream()
                    .map(bucket -> {
                        try {
                            return Integer.parseInt(bucket.key().stringValue());
                        } catch (NumberFormatException ex) {
                            return 0; // 无法解析的端口号，返回0作为默认值
                        }
                    })
                    .filter(port -> port > 0) // 过滤掉无效的端口号
                    .collect(Collectors.toSet());
            } catch (IllegalStateException e2) {
                // 如果两种类型都不匹配，返回空集合
                return Set.of();
            }
        }
        
        return portSet;
    }

    // 带 filePath 过滤的可用端口查询
    private Set<Integer> getAvailablePortsWithFilter(String startTime, String endTime, String index, String filePath) throws IOException {
        // 时间范围
        var rangeQuery = new Query.Builder()
            .range(r -> r
                .field("timestamp")
                .gte(JsonData.of(startTime))
                .lte(JsonData.of(endTime))
            );

        var boolBuilder = new co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery.Builder()
            .must(rangeQuery.build());
        if (filePath != null && !filePath.trim().isEmpty()) {
            boolBuilder.must(m -> m
                .match(t -> t
                    .field("filePath")
                    .query(filePath)
                )
            );
        }
        var query = Query.of(q -> q.bool(boolBuilder.build()));

        var searchRequest = SearchRequest.of(s -> s
            .index(index)
            .size(0)
            .query(query)
            .aggregations("ports", a -> a
                .terms(t -> t.field("port").size(100))
            )
        );

        var response = esClient.search(searchRequest, Void.class);
        if (response.aggregations() == null) return Set.of();
        var ports = response.aggregations().get("ports");
        if (ports == null) return Set.of();
        
        // 检查聚合结果的类型，支持 Long 和 String 类型
        Set<Integer> portSet = new java.util.HashSet<>();
        try {
            // 尝试作为 Long terms 处理
            var buckets = ports.lterms().buckets().array();
            portSet = buckets.stream().map(b -> (int)b.key()).collect(Collectors.toSet());
        } catch (IllegalStateException e) {
            try {
                // 如果失败，尝试作为 String terms 处理
                var buckets = ports.sterms().buckets().array();
                portSet = buckets.stream()
                    .map(b -> {
                        try {
                            return Integer.parseInt(b.key().stringValue());
                        } catch (NumberFormatException ex) {
                            return 0; // 无法解析的端口号，返回0作为默认值
                        }
                    })
                    .filter(port -> port > 0) // 过滤掉无效的端口号
                    .collect(Collectors.toSet());
            } catch (IllegalStateException e2) {
                // 如果两种类型都不匹配，返回空集合
                return Set.of();
            }
        }
        return portSet;
    }

    @SuppressWarnings("unused")
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

        // 执行查询
        var response = esClient.search(searchRequest, Void.class);

        long portTotal = 0L;
        try {
            var hits = response.hits();
            var totalObj = (hits != null) ? hits.total() : null;
            if (totalObj != null) {
                portTotal = totalObj.value();
            }
        } catch (Exception ignore) {}

        if (response.aggregations() == null) {
            return List.of();
        }

        // 处理结果
        var aggs = response.aggregations();
        var trend = aggs.get("trend");
        if (trend == null) {
            return List.of();
        }

        var buckets = trend.dateHistogram().buckets().array();

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
                    
                    return trendData;
                })
                .collect(Collectors.toList());

        return result;
    }

    // 带 filePath 过滤的带宽趋势查询（util 时间桶平均）
    private List<TrendingData> getBandwidthTrendingWithFilter(String startTime, String endTime, int port, String index, String interval, String filePath) throws IOException {
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
        var boolBuilder = new co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery.Builder()
            .must(rangeQuery.build())
            .must(portQuery.build());
        if (filePath != null && !filePath.trim().isEmpty()) {
            boolBuilder.must(m -> m
                .match(t -> t
                    .field("filePath")
                    .query(filePath)
                )
            );
        }
        var query = Query.of(q -> q.bool(boolBuilder.build()));

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
                    .avg(av -> av.field("util"))
                )
            )
        );

        var response = esClient.search(searchRequest, Void.class);
        if (response.aggregations() == null) return List.of();
        var trend = response.aggregations().get("trend");
        if (trend == null || trend.dateHistogram() == null) return List.of();
        var buckets = trend.dateHistogram().buckets().array();
        return buckets.stream().map(b -> {
            double avgUtil = 0.0;
            var avg = b.aggregations().get("avg_util");
            if (avg != null && avg.avg() != null) {
                Double v = avg.avg().value();
                if (v != null) avgUtil = v.doubleValue();
            }
            TrendingData td = new TrendingData();
            td.setTimestamp(b.key());
            td.setCount((long)Math.round(avgUtil * 100));
            return td;
        }).collect(Collectors.toList());
    }

    /**
     * 获取serviceName字段的聚合统计数据
     * @param topN 返回Top N的数据条数
     * @return 聚合结果
     * @throws IOException
     */
    public Map<String, Object> getServiceNameAggregation(Integer topN) throws IOException {
        return getServiceNameAggregation(topN, null, null, null);
    }

    /**
     * 获取serviceName字段的聚合统计数据（支持时间范围过滤和文件路径过滤）
     * @param topN 返回Top N的数据条数
     * @param startTime 开始时间戳（毫秒）
     * @param endTime 结束时间戳（毫秒）
     * @param filePath 文件路径（可选）
     * @return 聚合结果
     * @throws IOException
     */
    public Map<String, Object> getServiceNameAggregation(Integer topN, Long startTime, Long endTime, String filePath) throws IOException {
        log.info("Getting serviceName aggregation with topN: {}, startTime: {}, endTime: {}, filePath: {}", topN, startTime, endTime, filePath);
        String[] possibleFields = {"serviceName", "protoName", "serviceName.keyword", "protoName.keyword"};
        for (String field : possibleFields) {
            try {
                log.info("Trying field: {}", field);
                SearchRequest.Builder searchRequestBuilder = new SearchRequest.Builder()
                    .index("conn-*")
                    .size(0);
                
                // 构建查询条件
                Query.Builder queryBuilder = new Query.Builder();
                List<Query> mustQueries = new java.util.ArrayList<>();
                
                // 时间范围过滤
                if (startTime != null && endTime != null) {
                    log.info("Adding time range filter: {} to {}", startTime, endTime);
                    mustQueries.add(Query.of(q -> q
                        .range(r -> r
                            .field("timestamp")
                            .gte(JsonData.of(startTime))
                            .lte(JsonData.of(endTime))
                        )
                    ));
                }
                
                // 文件路径过滤
                if (filePath != null && !filePath.trim().isEmpty()) {
                    log.info("Adding filePath filter: {}", filePath);
                    mustQueries.add(Query.of(q -> q
                        .match(m -> m
                            .field("filePath")
                            .query(filePath)
                        )
                    ));
                }
                
                // 如果有过滤条件，添加到查询中
                if (!mustQueries.isEmpty()) {
                    queryBuilder.bool(b -> b.must(mustQueries));
                    searchRequestBuilder.query(queryBuilder.build());
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
                            serviceName = keyValue.toString();
                        }
                    } catch (Exception e) {
                        log.warn("Error parsing key value for bucket {}: {}", i, e.getMessage());
                        serviceName = "unknown";
                    }
                    Long docCount = bucket.docCount();
                    Map<String, Object> item = new java.util.HashMap<>();
                    item.put("serviceName", serviceName);
                    item.put("count", docCount);
                    data.add(item);
                    log.info("Service: {}, Count: {}", serviceName, docCount);
                }
                result.put("data", data);
                result.put("total", data.size());
                result.put("field", field);
                log.info("Successfully retrieved serviceName aggregation for field: {} with {} items", field, data.size());
                return result;
            } catch (Exception e) {
                log.error("Error getting serviceName aggregation for field {}: {}", field, e.getMessage(), e);
                continue;
            }
        }
        log.warn("No serviceName aggregation data found for any field");
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("data", new java.util.ArrayList<>());
        result.put("total", 0);
        result.put("field", "none");
        return result;
    }

// ... existing code ...
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

    // === New Methods: List indices and index fields ===
    public List<String> listIndices() throws IOException {
        // Return non-system aliases instead of raw index names
        List<AliasesRecord> aliasRecords = esClient.cat().aliases(a -> a).valueBody();
        List<String> aliases = aliasRecords.stream()
                .map(AliasesRecord::alias)
                .filter(Objects::nonNull)
                // Exclude system / internal aliases
                .filter(a -> !a.startsWith("."))
                .filter(a -> !a.startsWith("kibana"))
                .filter(a -> !a.startsWith("security"))
                .filter(a -> !a.startsWith("logstash"))
                .filter(a -> !a.startsWith("monitoring"))
                .filter(a -> !a.startsWith("apm-"))
                // Exclude aliases ending with 'pcap'
                .filter(a -> !a.endsWith("pcap"))
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        if (!aliases.isEmpty()) {
            return aliases;
        }
        // Fallback: if no aliases defined, return empty list (do not expose all indices)
        return List.of();
    }

    public List<Map<String, String>> listIndexFields(String index) throws IOException {
        return listIndexFields(index, null);
    }

    /**
     * List fields for an index with optional type filtering
     * @param index the index name
     * @param fieldTypeFilter "numeric" to only return numeric fields, "text" to only return text fields, "all" or null for all fields
     * @return list of field information
     */
    public List<Map<String, String>> listIndexFields(String index, String fieldTypeFilter) throws IOException {
        var resp = esClient.indices().getMapping(g -> g.index(index));
        var direct = resp.result().get(index);
        List<Map<String, String>> fields = new java.util.ArrayList<>();
        if (direct != null && direct.mappings() != null && direct.mappings().properties() != null) {
            collectFields(direct.mappings().properties(), fields, "");
        } else {
            // Treat parameter as alias -> merge all concrete index mappings
            resp.result().values().forEach(im -> {
                if (im.mappings() != null && im.mappings().properties() != null) {
                    collectFields(im.mappings().properties(), fields, "");
                }
            });
        }
        // Deduplicate by name keeping first occurrence
        Map<String, Map<String, String>> dedup = new java.util.LinkedHashMap<>();
        for (Map<String, String> f : fields) {
            dedup.putIfAbsent(f.get("name"), f);
        }
        
        Stream<Map<String, String>> fieldStream = dedup.values().stream()
                .filter(f -> {
                    String t = f.get("type");
                    return t != null && !t.equals("object") && !t.equals("nested");
                });
        
        // Apply field type filtering
        if ("numeric".equalsIgnoreCase(fieldTypeFilter)) {
            fieldStream = fieldStream.filter(f -> {
                String fieldType = f.get("type");
                return isNumericType(fieldType);
            });
        } else if ("text".equalsIgnoreCase(fieldTypeFilter)) {
            fieldStream = fieldStream.filter(f -> {
                String fieldType = f.get("type");
                return isTextType(fieldType);
            });
        }
        
        return fieldStream
                .sorted(java.util.Comparator.comparing(m -> m.get("name")))
                .collect(Collectors.toList());
    }

    private void collectFields(Map<String, Property> props, List<Map<String, String>> out, String prefix) {
        for (var entry : props.entrySet()) {
            String fieldName = prefix.isEmpty() ? entry.getKey() : prefix + "." + entry.getKey();
            Property p = entry.getValue();
            String type = p._kind().jsonValue();
            if (p.isObject()) {
                if (p.object().properties() != null) {
                    collectFields(p.object().properties(), out, fieldName);
                }
            } else if (p.isNested()) {
                if (p.nested().properties() != null) {
                    collectFields(p.nested().properties(), out, fieldName);
                }
            } else {
                out.add(Map.of("name", fieldName, "type", type));
            }
        }
    }

    /**
     * Check if a field is a numeric type suitable for Y-axis aggregations
     */
    private boolean isNumericField(String index, String fieldName) throws IOException {
        try {
            var resp = esClient.indices().getMapping(g -> g.index(index));
            // Check all index mappings (in case index is an alias)
            for (var indexMapping : resp.result().values()) {
                if (indexMapping.mappings() != null && indexMapping.mappings().properties() != null) {
                    Property fieldProperty = findFieldProperty(indexMapping.mappings().properties(), fieldName);
                    if (fieldProperty != null) {
                        String fieldType = fieldProperty._kind().jsonValue();
                        return isNumericType(fieldType);
                    }
                }
            }
            return false;
        } catch (Exception e) {
            log.warn("Error checking field type for field '{}' in index '{}': {}", fieldName, index, e.getMessage());
            return false;
        }
    }

    /**
     * Find a field property by name, supporting nested field names (e.g., "parent.child")
     */
    private Property findFieldProperty(Map<String, Property> properties, String fieldName) {
        if (fieldName == null || fieldName.isBlank()) {
            return null;
        }
        
        String[] parts = fieldName.split("\\.");
        Map<String, Property> currentProperties = properties;
        
        for (int i = 0; i < parts.length; i++) {
            String part = parts[i];
            Property property = currentProperties.get(part);
            
            if (property == null) {
                return null;
            }
            
            if (i == parts.length - 1) {
                // This is the final part, return the property
                return property;
            }
            
            // Navigate to nested properties
            if (property.isObject() && property.object().properties() != null) {
                currentProperties = property.object().properties();
            } else if (property.isNested() && property.nested().properties() != null) {
                currentProperties = property.nested().properties();
            } else {
                return null; // Can't navigate further
            }
        }
        
        return null;
    }

    /**
     * Check if a field type is numeric
     */
    private boolean isNumericType(String fieldType) {
        if (fieldType == null) {
            return false;
        }
        
        switch (fieldType.toLowerCase()) {
            case "long":
            case "integer":
            case "short":
            case "byte":
            case "double":
            case "float":
            case "half_float":
            case "scaled_float":
                return true;
            default:
                return false;
        }
    }

    /**
     * Check if a field type is text-based (suitable for categories/grouping)
     */
    private boolean isTextType(String fieldType) {
        if (fieldType == null) {
            return false;
        }
        
        switch (fieldType.toLowerCase()) {
            case "text":
            case "keyword":
            case "constant_keyword":
            case "wildcard":
                return true;
            default:
                return false;
        }
    }

    public Map<String,Object> executeWidgetQuery(WidgetQueryRequest req) throws IOException {
        String index = req.getIndex();
        long now = System.currentTimeMillis();
        long sevenDaysMillis = 7L * 24 * 60 * 60 * 1000;
        long start = req.getStartTime() != null ? req.getStartTime() : (now - sevenDaysMillis);
        long end = req.getEndTime() != null ? req.getEndTime() : now;

        // debug request with full object details
        log.info("Execute widget query: index={}, widgetType={}, aggField={}, aggType={}, yField={}", 
            req.getIndex(), req.getWidgetType(), req.getAggregationField(), req.getAggregationType(), req.getYField());
        log.info("Request object details: req.toString()={}", req);
        log.info("YField detailed check: yField='{}', isNull={}, isEmpty={}", 
            req.getYField(), req.getYField() == null, req.getYField() != null ? req.getYField().isEmpty() : "null");
        log.info("Time range: {} to {} (start={}, end={})", 
            java.time.Instant.ofEpochMilli(start), java.time.Instant.ofEpochMilli(end), start, end);
            
        // Extract and validate axis configuration
        // For now, we use yField as the primary axis field and timestamp as default x-axis
        String yFieldParam = req.getYField();
        String aggField = req.getAggregationField();
        String aggType = req.getAggregationType();
        if (aggType == null || aggType.isBlank()) aggType = "count";
        
        // Determine axis mapping based on widget type and field types
        final String chartXField;
        final String chartYField;
        
        // Smart axis detection: if yField is provided and is NOT a time field, use it for X-axis (categories)
        if (yFieldParam != null && !yFieldParam.isBlank() && !"null".equals(yFieldParam)) {
            boolean yFieldIsTime = yFieldParam.equals("timestamp") || yFieldParam.contains("time") || yFieldParam.contains("date");
            log.info("Axis mapping decision: yFieldParam='{}', yFieldIsTime={}", yFieldParam, yFieldIsTime);
            if (yFieldIsTime) {
                // Y-field is a time field, use it for x-axis (time series)
                chartXField = yFieldParam;
                chartYField = aggField; // Use aggregation field for y-axis values
                log.info("Using TIME-based mapping: chartXField='{}', chartYField='{}'", chartXField, chartYField);
            } else {
                // Y-field is categorical, use it for grouping (becomes x-axis in terms aggregation)
                chartXField = yFieldParam; // Category field for terms aggregation
                chartYField = aggField; // Metric field for y-axis values
                log.info("Using CATEGORY-based mapping: chartXField='{}', chartYField='{}'", chartXField, chartYField);
            }
        } else {
            // Default: use timestamp for x-axis time series
            chartXField = "timestamp";
            chartYField = null; // Will use document count
            log.info("Using DEFAULT mapping: chartXField='{}', chartYField='{}' (yFieldParam was: '{}')", chartXField, chartYField, yFieldParam);
        }
        
        log.info("Chart axis mapping: X-axis='{}', Y-axis='{}', aggField='{}', aggType='{}'", 
            chartXField, chartYField, aggField, aggType);
        if (req.getFilters() != null && !req.getFilters().isEmpty()) {
            log.info("Applied filters:");
            for (WidgetFilter f : req.getFilters()) {
                log.info("  - field: {}, operator: {}, value: {}", f.getField(), f.getOperator(), f.getValue());
            }
        } else {
            log.info("No filters applied");
        }

        var boolBuilder = new co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery.Builder();
        boolBuilder.must(m -> m.range(r -> r.field("timestamp").gte(JsonData.of(start)).lte(JsonData.of(end))));
        if (req.getFilters() != null) {
            for (WidgetFilter f : req.getFilters()) {
                if (f.getField() == null || f.getField().isBlank() || f.getOperator() == null) continue;
                switch (f.getOperator()) {
                    case "exists":
                        boolBuilder.must(m -> m.exists(e -> e.field(f.getField())));
                        break;
                    case "not_exists":
                        boolBuilder.must(m -> m.bool(b -> b.mustNot(n -> n.exists(e -> e.field(f.getField())))));
                        break;
                    case "eq":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            String v = f.getValue();
                            boolBuilder.must(m -> m.term(t -> t.field(f.getField()).value(vb -> vb.stringValue(v))));
                        }
                        break;
                    case "neq":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            String v = f.getValue();
                            boolBuilder.must(m -> m.bool(b -> b.mustNot(n -> n.term(t -> t.field(f.getField()).value(vb -> vb.stringValue(v))))));
                        }
                        break;
                    case "gt":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            String v = f.getValue();
                            boolBuilder.must(m -> m.range(r -> r.field(f.getField()).gt(JsonData.of(v))));
                        }
                        break;
                    case "gte":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            String v = f.getValue();
                            boolBuilder.must(m -> m.range(r -> r.field(f.getField()).gte(JsonData.of(v))));
                        }
                        break;
                    case "lt":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            String v = f.getValue();
                            boolBuilder.must(m -> m.range(r -> r.field(f.getField()).lt(JsonData.of(v))));
                        }
                        break;
                    case "lte":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            String v = f.getValue();
                            boolBuilder.must(m -> m.range(r -> r.field(f.getField()).lte(JsonData.of(v))));
                        }
                        break;
                    default:
                        break;
                }
            }
        }
        Query finalQuery = Query.of(q -> q.bool(boolBuilder.build()));
        
        // Log the final query structure with Kibana-compatible format
        log.info("Final ES Query structure: {}", objectMapper.writeValueAsString(finalQuery));
        
        // Create a properly formatted Kibana query map for better readability
        Map<String, Object> queryMap = new java.util.HashMap<>();
        Map<String, Object> boolMap = new java.util.HashMap<>();
        List<Map<String, Object>> mustClauses = new java.util.ArrayList<>();
        
        // Add time range
        mustClauses.add(Map.of(
            "range", Map.of(
                "timestamp", Map.of(
                    "gte", start,
                    "lte", end
                )
            )
        ));
        
        // Add filters
        if (req.getFilters() != null) {
            for (WidgetFilter f : req.getFilters()) {
                if (f.getField() == null || f.getField().isBlank() || f.getOperator() == null) continue;
                Map<String, Object> filterClause = new java.util.HashMap<>();
                switch (f.getOperator()) {
                    case "exists":
                        filterClause.put("exists", Map.of("field", f.getField()));
                        break;
                    case "not_exists":
                        filterClause.put("bool", Map.of("must_not", List.of(Map.of("exists", Map.of("field", f.getField())))));
                        break;
                    case "eq":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            filterClause.put("term", Map.of(f.getField(), Map.of("value", f.getValue())));
                        }
                        break;
                    case "neq":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            filterClause.put("bool", Map.of("must_not", List.of(Map.of("term", Map.of(f.getField(), Map.of("value", f.getValue()))))));
                        }
                        break;
                    case "gt":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            filterClause.put("range", Map.of(f.getField(), Map.of("gt", f.getValue())));
                        }
                        break;
                    case "gte":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            filterClause.put("range", Map.of(f.getField(), Map.of("gte", f.getValue())));
                        }
                        break;
                    case "lt":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            filterClause.put("range", Map.of(f.getField(), Map.of("lt", f.getValue())));
                        }
                        break;
                    case "lte":
                        if (f.getValue() != null && !f.getValue().isBlank()) {
                            filterClause.put("range", Map.of(f.getField(), Map.of("lte", f.getValue())));
                        }
                        break;
                }
                if (!filterClause.isEmpty()) {
                    mustClauses.add(filterClause);
                }
            }
        }
        
        boolMap.put("must", mustClauses);
        queryMap.put("bool", boolMap);
        
        log.info("=== Kibana Query Structure ===");
        log.info("{}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of("query", queryMap)));
        log.info("=== End Query Structure ===");

        String widgetType = req.getWidgetType();
        if (widgetType != null && !"table".equalsIgnoreCase(widgetType)) {
            // PIE chart separate logic (terms aggregation)
            if ("pie".equalsIgnoreCase(widgetType)) {
                if (aggField == null || aggField.isBlank()) {
                    return Map.of("error", "Aggregation field required for pie widget");
                }
                if (aggType == null || aggType.isBlank()) aggType = "count";
                
                // For pie charts, aggField is the category field (text field)
                // metricField is used for value calculation (numeric field)
                boolean docCountMode = "count".equalsIgnoreCase(aggType);
                String metricField = req.getMetricField();
                
                // Check if we have a metric field for non-count aggregations
                if (!docCountMode && (metricField == null || metricField.isBlank())) {
                    return Map.of("error", "Metric field is required for " + aggType + " aggregation in pie chart");
                }
                
                var srb = new SearchRequest.Builder()
                        .index(index)
                        .size(0)
                        .query(finalQuery);
                
                if (docCountMode) {
                    // Simple terms aggregation for count
                    srb.aggregations("pie", a -> a.terms(t -> t.field(aggField).size(10)));
                } else {
                    // Terms aggregation with metric sub-aggregation
                    switch (aggType) {
                        case "sum":
                            srb.aggregations("pie", a -> a.terms(t -> t.field(aggField).size(10))
                                    .aggregations("metric", sub -> sub.sum(m -> m.field(metricField))));
                            break;
                        case "avg":
                            srb.aggregations("pie", a -> a.terms(t -> t.field(aggField).size(10))
                                    .aggregations("metric", sub -> sub.avg(m -> m.field(metricField))));
                            break;
                        case "min":
                            srb.aggregations("pie", a -> a.terms(t -> t.field(aggField).size(10))
                                    .aggregations("metric", sub -> sub.min(m -> m.field(metricField))));
                            break;
                        case "max":
                            srb.aggregations("pie", a -> a.terms(t -> t.field(aggField).size(10))
                                    .aggregations("metric", sub -> sub.max(m -> m.field(metricField))));
                            break;
                        case "count":
                        default:
                            srb.aggregations("pie", a -> a.terms(t -> t.field(aggField).size(10))
                                    .aggregations("metric", sub -> sub.valueCount(m -> m.field(metricField))));
                            break;
                    }
                }
                
                // Print Kibana query for PIE chart
                log.info("=== Kibana Query for PIE Widget ===");
                log.info("GET /{}/_search", index);
                log.info("Content-Type: application/json");
                log.info("");
                
                Map<String, Object> pieAggDef = new java.util.HashMap<>();
                pieAggDef.put("terms", Map.of(
                    "field", aggField,
                    "size", 10
                ));
                
                if (!docCountMode) {
                    Map<String, Object> metricAggDef = new java.util.HashMap<>();
                    switch (aggType) {
                        case "sum":
                            metricAggDef.put("sum", Map.of("field", metricField));
                            break;
                        case "avg":
                            metricAggDef.put("avg", Map.of("field", metricField));
                            break;
                        case "min":
                            metricAggDef.put("min", Map.of("field", metricField));
                            break;
                        case "max":
                            metricAggDef.put("max", Map.of("field", metricField));
                            break;
                        case "count":
                        default:
                            metricAggDef.put("value_count", Map.of("field", metricField));
                            break;
                    }
                    pieAggDef.put("aggs", Map.of("metric", metricAggDef));
                }
                
                log.info("{}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
                    "size", 0,
                    "query", finalQuery,
                    "aggs", Map.of("pie", pieAggDef)
                )));
                log.info("=== End Kibana Query ===");
                
                var resp = esClient.search(srb.build(), Void.class);
                var pieAgg = resp.aggregations().get("pie");
                if (pieAgg == null || pieAgg.sterms() == null) {
                    return Map.of("start", start, "end", end, "labels", List.of(), "values", List.of());
                }
                List<String> labels = new java.util.ArrayList<>();
                List<Double> values = new java.util.ArrayList<>();
                for (var b : pieAgg.sterms().buckets().array()) {
                    String label = b.key().isString() ? b.key().stringValue() : b.key().toString();
                    labels.add(label);
                    
                    Double val;
                    if (!docCountMode && b.aggregations() != null && b.aggregations().get("metric") != null) {
                        var metric = b.aggregations().get("metric");
                        // Use aggType to determine which aggregation result to access
                        switch (aggType) {
                            case "sum":
                                val = metric.sum() != null ? metric.sum().value() : 0d;
                                break;
                            case "avg":
                                val = metric.avg() != null ? metric.avg().value() : 0d;
                                break;
                            case "min":
                                val = metric.min() != null ? metric.min().value() : 0d;
                                break;
                            case "max":
                                val = metric.max() != null ? metric.max().value() : 0d;
                                break;
                            case "count":
                            default:
                                val = metric.valueCount() != null ? (double) metric.valueCount().value() : 0d;
                                break;
                        }
                    } else {
                        val = (double) b.docCount();
                    }
                    values.add(val != null ? val : 0d);
                }
                return Map.of(
                        "start", start,
                        "end", end,
                        "labels", labels,
                        "values", values,
                        "aggregation", aggType,
                        "categoryField", aggField,
                        "metricField", docCountMode ? "_doc_count" : metricField
                );
            }
            // LINE / BAR: date_histogram or terms aggregation based on axis configuration
            if (aggType == null || aggType.isBlank()) aggType = "count";

            // For line/bar charts, determine the best axis mapping
            // chartXField and chartYField were already determined above
            
            // Smart axis detection based on field types and user input

            boolean docCountMode = (aggField == null || aggField.isBlank()) && "count".equalsIgnoreCase(aggType);
            if (!docCountMode && (aggField == null || aggField.isBlank())) {
                return Map.of("error", "Aggregation field required for chart widget");
            }

            // Validate Y-axis field type for line/bar charts
            // For category-based charts (non-time X-axis), the aggregation field (Y-axis) must be numeric
            boolean isDateField = chartXField != null && (chartXField.equals("timestamp") || chartXField.contains("time") || chartXField.contains("date"));
            if (!isDateField && !docCountMode && aggField != null && !aggField.isBlank()) {
                // Check if the aggregation field is numeric for category-based charts
                boolean isAggFieldNumeric = isNumericField(index, aggField);
                log.info("Y-axis field validation: aggField='{}', isNumeric={}, aggType='{}'", aggField, isAggFieldNumeric, aggType);
                
                if (!isAggFieldNumeric && !"count".equalsIgnoreCase(aggType)) {
                    return Map.of("error", String.format("Y-axis field '%s' must be a numeric type for %s charts. Current field type is not numeric. Please select a numeric field or use 'count' aggregation.", aggField, isDateField ? "time-series" : "category"));
                }
            }

            // Determine if chartXField is a date field or category field
            
            log.info("Chart configuration: xField='{}', yField='{}', isDateField={}, aggField='{}', aggType='{}', docCountMode={}", 
                chartXField, chartYField, isDateField, aggField, aggType, docCountMode);
            
            var srb = new SearchRequest.Builder()
                    .index(index)
                    .size(0)
                    .query(finalQuery);

            if (isDateField) {
                // Use date histogram for time-based charts
                String timeField = (chartXField != null && !chartXField.isBlank()) ? chartXField : "timestamp";
                srb.aggregations("time", a -> a.dateHistogram(d -> d.field(timeField).calendarInterval(CalendarInterval.Hour).minDocCount(0)));

                if (!docCountMode) {
                    // add metric sub agg only when a field provided
                    switch (aggType) {
                        case "sum":
                            srb.aggregations("time", a -> a.dateHistogram(d -> d.field(timeField).calendarInterval(CalendarInterval.Hour).minDocCount(0))
                                    .aggregations("metric", sub -> sub.sum(m -> m.field(aggField))));
                            break;
                        case "avg":
                            srb.aggregations("time", a -> a.dateHistogram(d -> d.field(timeField).calendarInterval(CalendarInterval.Hour).minDocCount(0))
                                    .aggregations("metric", sub -> sub.avg(m -> m.field(aggField))));
                            break;
                        case "min":
                            srb.aggregations("time", a -> a.dateHistogram(d -> d.field(timeField).calendarInterval(CalendarInterval.Hour).minDocCount(0))
                                    .aggregations("metric", sub -> sub.min(m -> m.field(aggField))));
                            break;
                        case "max":
                            srb.aggregations("time", a -> a.dateHistogram(d -> d.field(timeField).calendarInterval(CalendarInterval.Hour).minDocCount(0))
                                    .aggregations("metric", sub -> sub.max(m -> m.field(aggField))));
                            break;
                        case "count":
                        default:
                            srb.aggregations("time", a -> a.dateHistogram(d -> d.field(timeField).calendarInterval(CalendarInterval.Hour).minDocCount(0))
                                    .aggregations("metric", sub -> sub.valueCount(m -> m.field(aggField))));
                            break;
                    }
                }
                
                // Print Kibana query for TIME-based chart
                Map<String, Object> kibanaQuery = new java.util.HashMap<>();
                kibanaQuery.put("size", 0);
                kibanaQuery.put("query", finalQuery);
                
                Map<String, Object> timeAggDef = new java.util.HashMap<>();
                timeAggDef.put("date_histogram", Map.of(
                    "field", timeField,
                    "calendar_interval", "1h",
                    "min_doc_count", 0
                ));
                
                if (!docCountMode) {
                    Map<String, Object> metricAggDef = new java.util.HashMap<>();
                    switch (aggType) {
                        case "sum":
                            metricAggDef.put("sum", Map.of("field", aggField));
                            break;
                        case "avg":
                            metricAggDef.put("avg", Map.of("field", aggField));
                            break;
                        case "min":
                            metricAggDef.put("min", Map.of("field", aggField));
                            break;
                        case "max":
                            metricAggDef.put("max", Map.of("field", aggField));
                            break;
                        case "count":
                        default:
                            metricAggDef.put("value_count", Map.of("field", aggField));
                            break;
                    }
                    timeAggDef.put("aggs", Map.of("metric", metricAggDef));
                }
                
                kibanaQuery.put("aggs", Map.of("time", timeAggDef));
                
                log.info("=== Kibana Query for TIME-based LINE/BAR Widget ===");
                log.info("GET /{}/_search", index);
                log.info("Content-Type: application/json");
                log.info("");
                log.info("{}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(kibanaQuery));
                log.info("=== End Kibana Query ===");
                
                var resp = esClient.search(srb.build(), Void.class);
                var timeAgg = resp.aggregations().get("time");
                if (timeAgg == null || timeAgg.dateHistogram() == null) {
                    return Map.of("start", start, "end", end, "x", List.of(), "y", List.of());
                }
                List<Long> x = new java.util.ArrayList<>();
                List<Double> y = new java.util.ArrayList<>();
                for (var b : timeAgg.dateHistogram().buckets().array()) {
                    x.add(b.key());
                    Double val;
                    if (!docCountMode && b.aggregations() != null && b.aggregations().get("metric") != null) {
                        var metric = b.aggregations().get("metric");
                        // Use aggType to determine which aggregation result to access
                        switch (aggType) {
                            case "sum":
                                val = metric.sum() != null ? metric.sum().value() : 0d;
                                break;
                            case "avg":
                                val = metric.avg() != null ? metric.avg().value() : 0d;
                                break;
                            case "min":
                                val = metric.min() != null ? metric.min().value() : 0d;
                                break;
                            case "max":
                                val = metric.max() != null ? metric.max().value() : 0d;
                                break;
                            case "count":
                            default:
                                val = metric.valueCount() != null ? (double) metric.valueCount().value() : 0d;
                                break;
                        }
                    } else {
                        val = (double) b.docCount();
                    }
                    y.add(val != null ? val : 0d);
                }
                return Map.of(
                        "start", start,
                        "end", end,
                        "x", x,
                        "y", y,
                        "aggregation", aggType,
                        "field", docCountMode ? "_doc_count" : aggField,
                        "yField", timeField
                );
            } else {
                // Use terms aggregation for category-based charts
                log.info("Using category-based chart logic for xField='{}' (not null: {}, not blank: {})", 
                    chartXField, chartXField != null, chartXField != null && !chartXField.isBlank());
                    
                if (chartXField == null || chartXField.isBlank()) {
                    log.error("ERROR: chartXField validation failed - xField='{}', isNull={}, isBlank={}", 
                        chartXField, chartXField == null, chartXField != null ? chartXField.isBlank() : "null");
                    return Map.of("error", "X Field is required for category-based chart");
                }
                
                srb.aggregations("categories", a -> a.terms(t -> t.field(chartXField).size(10)));

                if (!docCountMode) {
                    switch (aggType) {
                        case "sum":
                            srb.aggregations("categories", a -> a.terms(t -> t.field(chartXField).size(10))
                                    .aggregations("metric", sub -> sub.sum(m -> m.field(aggField))));
                            break;
                        case "avg":
                            srb.aggregations("categories", a -> a.terms(t -> t.field(chartXField).size(10))
                                    .aggregations("metric", sub -> sub.avg(m -> m.field(aggField))));
                            break;
                        case "min":
                            srb.aggregations("categories", a -> a.terms(t -> t.field(chartXField).size(10))
                                    .aggregations("metric", sub -> sub.min(m -> m.field(aggField))));
                            break;
                        case "max":
                            srb.aggregations("categories", a -> a.terms(t -> t.field(chartXField).size(10))
                                    .aggregations("metric", sub -> sub.max(m -> m.field(aggField))));
                            break;
                        case "count":
                        default:
                            srb.aggregations("categories", a -> a.terms(t -> t.field(chartXField).size(10))
                                    .aggregations("metric", sub -> sub.valueCount(m -> m.field(aggField))));
                            break;
                    }
                }
                
                // Print Kibana query for CATEGORY-based chart
                Map<String, Object> kibanaQuery = new java.util.HashMap<>();
                kibanaQuery.put("size", 0);
                kibanaQuery.put("query", finalQuery);
                
                Map<String, Object> categoriesAggDef = new java.util.HashMap<>();
                categoriesAggDef.put("terms", Map.of(
                    "field", chartXField,
                    "size", 10
                ));
                
                if (!docCountMode) {
                    Map<String, Object> metricAggDef = new java.util.HashMap<>();
                    switch (aggType) {
                        case "sum":
                            metricAggDef.put("sum", Map.of("field", aggField));
                            break;
                        case "avg":
                            metricAggDef.put("avg", Map.of("field", aggField));
                            break;
                        case "min":
                            metricAggDef.put("min", Map.of("field", aggField));
                            break;
                        case "max":
                            metricAggDef.put("max", Map.of("field", aggField));
                            break;
                        case "count":
                        default:
                            metricAggDef.put("value_count", Map.of("field", aggField));
                            break;
                    }
                    categoriesAggDef.put("aggs", Map.of("metric", metricAggDef));
                }
                
                kibanaQuery.put("aggs", Map.of("categories", categoriesAggDef));
                
                log.info("=== Kibana Query for CATEGORY-based LINE/BAR Widget ===");
                log.info("GET /{}/_search", index);
                log.info("Content-Type: application/json");
                log.info("");
                log.info("{}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(kibanaQuery));
                log.info("=== End Kibana Query ===");
                
                var resp = esClient.search(srb.build(), Void.class);
                var catAgg = resp.aggregations().get("categories");
                if (catAgg == null || catAgg.sterms() == null) {
                    return Map.of("start", start, "end", end, "x", List.of(), "y", List.of());
                }
                List<String> x = new java.util.ArrayList<>();
                List<Double> y = new java.util.ArrayList<>();
                for (var b : catAgg.sterms().buckets().array()) {
                    String categoryName = b.key().isString() ? b.key().stringValue() : b.key().toString();
                    x.add(categoryName);
                    Double val;
                    if (!docCountMode && b.aggregations() != null && b.aggregations().get("metric") != null) {
                        var metric = b.aggregations().get("metric");
                        // Use aggType to determine which aggregation result to access
                        switch (aggType) {
                            case "sum":
                                val = metric.sum() != null ? metric.sum().value() : 0d;
                                break;
                            case "avg":
                                val = metric.avg() != null ? metric.avg().value() : 0d;
                                break;
                            case "min":
                                val = metric.min() != null ? metric.min().value() : 0d;
                                break;
                            case "max":
                                val = metric.max() != null ? metric.max().value() : 0d;
                                break;
                            case "count":
                            default:
                                val = metric.valueCount() != null ? (double) metric.valueCount().value() : 0d;
                                break;
                        }
                    } else {
                        val = (double) b.docCount();
                    }
                    y.add(val != null ? val : 0d);
                }
                return Map.of(
                        "start", start,
                        "end", end,
                        "x", x,  // category names instead of timestamps
                        "y", y,
                        "aggregation", aggType,
                        "field", docCountMode ? "_doc_count" : aggField,
                        "xField", chartXField,
                        "yField", chartYField,
                        "chartType", "category"
                );
            }
        }

        // table widget
        log.info("=== Kibana Query for TABLE Widget ===");
        log.info("GET /{}/_search", index);
        log.info("Content-Type: application/json");
        log.info("");
        
        // 处理表格参数
        Integer tableSize = req.getTopN() != null ? req.getTopN() : 10;
        String tableSortField = req.getSortField() != null && !req.getSortField().isEmpty() ? req.getSortField() : "timestamp";
        String tableSortOrder = req.getSortOrder() != null && req.getSortOrder().equalsIgnoreCase("asc") ? "asc" : "desc";
        
        log.info("Table parameters: size={}, sortField={}, sortOrder={}", tableSize, tableSortField, tableSortOrder);
        
        log.info("{}", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
            "size", tableSize,
            "query", finalQuery,
            "sort", List.of(Map.of(
                tableSortField, Map.of(
                    "order", tableSortOrder
                )
            ))
        )));
        log.info("=== End Kibana Query ===");
        
        // 根据排序顺序设置 SortOrder
        co.elastic.clients.elasticsearch._types.SortOrder esSortOrder = 
            "asc".equalsIgnoreCase(tableSortOrder) ? 
                co.elastic.clients.elasticsearch._types.SortOrder.Asc : 
                co.elastic.clients.elasticsearch._types.SortOrder.Desc;
        
        var tableResp = esClient.search(s -> s
                .index(index)
                .query(finalQuery)
                .size(tableSize)
                .sort(so -> so.field(f -> f.field(tableSortField).order(esSortOrder)))
                , JsonData.class);
        List<Map<String,Object>> docs = tableResp.hits().hits().stream()
                .map(h -> h.source())
                .filter(s -> s != null)
                .map(s -> {
                    @SuppressWarnings("unchecked")
                    Map<String,Object> result = s.to(Map.class);
                    return result;
                })
                .toList();
        Long totalVal = null;
        if (tableResp.hits() != null) {
            var totalResult = tableResp.hits().total();
            if (totalResult != null) {
                totalVal = totalResult.value();
            }
        }
        return Map.of(
                "start", start,
                "end", end,
                "total", totalVal != null ? totalVal : docs.size(),
                "data", docs
        );
    }

    /**
     * 资产聚合（event-*）：先按 alert.severity 分组(1高/2中/3低)，再按 src_ip 分组，取每个 src_ip 的最大 timestamp。
     * - 过滤条件：timestamp in [startTime, endTime]，可选 filePath match
     * - 返回字段：severity(数值)、severityLabel(High/Medium/Low)、asset(IP)、eventCount、lastTimestamp
     * - 排序：severity 升序(1->2->3)，同一severity内按 eventCount 降序；最后截断到前 N 条
     */
    public Map<String, Object> getAssetAggregation(Long startTime, Long endTime, String filePath, Integer size) throws IOException {
        long start = startTime != null ? startTime : (System.currentTimeMillis() - 24L*60*60*1000);
        long end = endTime != null ? endTime : System.currentTimeMillis();
        int topN = (size != null && size > 0) ? size : 5;

        // 构建过滤查询
        var boolBuilder = new co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery.Builder();
        boolBuilder.must(m -> m.range(r -> r.field("timestamp").gte(JsonData.of(start)).lte(JsonData.of(end))));
        if (filePath != null && !filePath.isBlank()) {
            boolBuilder.must(m -> m.match(t -> t.field("filePath").query(filePath)));
        }
        Query query = Query.of(q -> q.bool(boolBuilder.build()));

        // 先按 alert.severity (long terms) -> 再按 src_ip (string terms) 并取 max(timestamp)
        var srb = new SearchRequest.Builder()
            .index("event-*")
            .size(0)
            .query(query)
            .aggregations("by_sev", a -> a
                .terms(t -> t.field("alert.severity").size(3))
                .aggregations("by_src", sub -> sub
                    .terms(tt -> tt.field("src_ip").size(Math.max(topN, 100)))
                    .aggregations("last_ts", mx -> mx.max(m -> m.field("timestamp")))
                )
            );

        var resp = esClient.search(srb.build(), Void.class);
        var sevAgg = resp.aggregations().get("by_sev");
        try {
            if (sevAgg == null || sevAgg.lterms() == null || sevAgg.lterms().buckets() == null) {
                return Map.of("total", 0, "data", List.of());
            }
            var sevBuckets = sevAgg.lterms().buckets().array();
            java.util.List<Map<String, Object>> rows = new java.util.ArrayList<>();
            // 固定 severity 顺序 1 -> 2 -> 3
            int[] sevOrder = new int[] {1, 2, 3};
            for (int sevWanted : sevOrder) {
                // 找到对应 severity 的 bucket
                var optBucket = sevBuckets.stream().filter(b -> (int)b.key() == sevWanted).findFirst();
            if (optBucket.isEmpty()) continue;
            var bSev = optBucket.get();
            var bySrc = bSev.aggregations() != null ? bSev.aggregations().get("by_src") : null;
            if (bySrc == null || bySrc.sterms() == null) continue;
            var ipBuckets = bySrc.sterms().buckets().array();
            // 转为列表并按 docCount 降序
            java.util.List<co.elastic.clients.elasticsearch._types.aggregations.StringTermsBucket> ipList = new java.util.ArrayList<>();
            for (int i = 0; i < ipBuckets.size(); i++) ipList.add(ipBuckets.get(i));
            ipList.sort((a,b) -> Long.compare(b.docCount(), a.docCount()));

            for (var ipBucket : ipList) {
                String asset;
                var keyValue = ipBucket.key();
                if (keyValue != null) {
                    try {
                        asset = keyValue.isString() ? keyValue.stringValue() : keyValue.toString();
                    } catch (Exception e) {
                        asset = keyValue.toString();
                    }
                } else {
                    asset = "unknown";
                }
                long count = ipBucket.docCount();
                Long lastTs = null;
                if (ipBucket.aggregations() != null) {
                    var mx = ipBucket.aggregations().get("last_ts");
                    if (mx != null && mx.max() != null) {
                        Double v = mx.max().value();
                        if (v != null) lastTs = v.longValue();
                    }
                }
                int sevInt = sevWanted;
                String severityLabel = switch (sevInt) {
                    case 1 -> "High";
                    case 2 -> "Medium";
                    default -> "Low";
                };
                rows.add(Map.of(
                    "asset", asset,
                    "severity", sevInt,
                    "severityLabel", severityLabel,
                    "eventCount", count,
                    "lastTimestamp", lastTs
                ));
            }
        }

        // 由于已按 severity 顺序遍历且按 count 降序收集，仅需截断

        if (rows.size() > topN) rows = rows.subList(0, topN);
        return Map.of(
            "total", rows.size(),
            "data", rows
        );
        } catch (IllegalStateException e) {
            // 如果 lterms() 失败，说明字段类型不匹配，返回空结果
            log.warn("Failed to process severity aggregation as Long terms: {}", e.getMessage());
            return Map.of("total", 0, "data", List.of());
        }
    }

    /**
     * 告警聚合（event-*）：按 alert.severity 分组(1高/2中/3低)，再按 signature 分组并取每个 signature 的最大 timestamp。
     * - 过滤条件：timestamp in [startTime, endTime]，可选 filePath match
     * - 返回字段：severity(数值)、severityLabel(High/Medium/Low)、signature、eventCount、lastTimestamp
     * - 排序：severity 固定顺序(1->2->3)，同一 severity 内按 eventCount 降序；最后整体截断到前 N 条
     */
    public Map<String, Object> getAlarmAggregation(Long startTime, Long endTime, String filePath, Integer size) throws IOException {
        long start = startTime != null ? startTime : (System.currentTimeMillis() - 24L*60*60*1000);
        long end = endTime != null ? endTime : System.currentTimeMillis();
        int topN = (size != null && size > 0) ? size : 5;

    // 构建过滤查询：仅使用 timestamp 字段（不查询 @timestamp）
        var boolBuilder = new co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery.Builder();
    boolBuilder.must(m -> m.range(r -> r.field("timestamp").gte(JsonData.of(start)).lte(JsonData.of(end))));
        if (filePath != null && !filePath.isBlank()) {
            boolBuilder.must(m -> m.match(t -> t.field("filePath").query(filePath)));
        }
        Query query = Query.of(q -> q.bool(boolBuilder.build()));

        // 构建请求（优先使用 keyword 字段），失败时回退到非 keyword 字段
        SearchResponse<Void> resp;
        try {
            var req1 = buildAlarmAggRequest(query, topN, true);
            resp = esClient.search(req1, Void.class);
        } catch (Exception e) {
            log.warn("alarm aggregation with keyword fields failed, fallback to non-keyword: {}", e.getMessage());
            var req2 = buildAlarmAggRequest(query, topN, false);
            resp = esClient.search(req2, Void.class);
        }
    var sevAgg = resp.aggregations().get("by_sev");
        try {
            if (sevAgg == null || sevAgg.lterms() == null || sevAgg.lterms().buckets() == null) {
                return Map.of("total", 0, "data", java.util.List.of());
            }

            var sevBuckets = sevAgg.lterms().buckets().array();
        java.util.List<Map<String, Object>> rows = new java.util.ArrayList<>();
        int[] sevOrder = new int[]{1, 2, 3};
        for (int sevWanted : sevOrder) {
            var optBucket = sevBuckets.stream().filter(b -> (int) b.key() == sevWanted).findFirst();
            if (optBucket.isEmpty()) continue;
            var bSev = optBucket.get();
            var bySig = bSev.aggregations() != null ? bSev.aggregations().get("by_sig") : null;
            if (bySig == null || bySig.sterms() == null) continue;
            var sigBuckets = bySig.sterms().buckets().array();

            // 将 signature buckets 转为列表并按 docCount 降序
            java.util.List<co.elastic.clients.elasticsearch._types.aggregations.StringTermsBucket> sigList = new java.util.ArrayList<>();
            for (int j = 0; j < sigBuckets.size(); j++) sigList.add(sigBuckets.get(j));
            sigList.sort((a, b) -> Long.compare(b.docCount(), a.docCount()));

            for (var sigBucket : sigList) {
                String signatureVal;
                var sigKey = sigBucket.key();
                if (sigKey != null) {
                    try { signatureVal = sigKey.isString() ? sigKey.stringValue() : sigKey.toString(); }
                    catch (Exception e) { signatureVal = sigKey.toString(); }
                } else {
                    signatureVal = "unknown";
                }

                long count = sigBucket.docCount();
                Long lastTs = null;
                if (sigBucket.aggregations() != null) {
                    var mx = sigBucket.aggregations().get("last_ts");
                    if (mx != null && mx.max() != null) {
                        Double v = mx.max().value();
                        if (v != null) lastTs = v.longValue();
                    }
                }

                int sevInt = sevWanted;
                String severityLabel = switch (sevInt) {
                    case 1 -> "High";
                    case 2 -> "Medium";
                    default -> "Low";
                };

                rows.add(Map.of(
                    "signature", signatureVal,
                    "severity", sevInt,
                    "severityLabel", severityLabel,
                    "eventCount", count,
                    "lastTimestamp", lastTs
                ));
            }
        }

        // 由于已按 severity 顺序与 count 排序收集，仅需截断
        if (rows.size() > topN) rows = rows.subList(0, topN);
        return Map.of(
            "total", rows.size(),
            "data", rows
        );
        } catch (IllegalStateException e) {
            // 如果 lterms() 失败，说明字段类型不匹配，返回空结果
            log.warn("Failed to process severity aggregation as Long terms: {}", e.getMessage());
            return Map.of("total", 0, "data", java.util.List.of());
        }
    }

    // 根据是否使用 keyword 字段构建告警聚合请求
    private co.elastic.clients.elasticsearch.core.SearchRequest buildAlarmAggRequest(Query query, int topN, boolean useKeyword) {
        String signatureField = useKeyword ? "alert.signature.keyword" : "alert.signature";

        return new co.elastic.clients.elasticsearch.core.SearchRequest.Builder()
            .index("event-*")
            .size(0)
            .allowNoIndices(true)
            .ignoreUnavailable(true)
            .query(query)
            .aggregations("by_sev", a -> a
                .terms(t -> t
                    .field("alert.severity")
                    .size(3)
                )
                .aggregations("by_sig", sig -> sig
                    .terms(ttt -> ttt
                        .field(signatureField)
                        .size(Math.max(topN, 200))
                        .missing("unknown")
                    )
                    .aggregations("last_ts", mx -> mx.max(m -> m.field("timestamp")))
                )
            )
            .build();
    }

    /**
     * Delete all documents in Elasticsearch associated with a given sessionId.
     * Rather than hardcoding index patterns, this method enumerates all non-system indices
     * via _cat/indices and executes delete-by-query against each. A document matches if any of:
     * - sessionId term equals the provided sessionId
     * - uuid term equals the provided sessionId
     * - filePath contains the provided sessionId (match query)
     * System or internal indices are skipped (names starting with "." or known internal prefixes).
     */
    public long deleteBySessionId(String sessionId) throws IOException {
        if (sessionId == null || sessionId.isBlank()) {
            return 0L;
        }

        // Build a bool query matching sessionId in either sessionId or uuid fields, also try filePath contains sessionId
        BoolQuery.Builder bool = new BoolQuery.Builder();
        bool.should(s -> s.term(t -> t.field("sessionId").value(v -> v.stringValue(sessionId))))
            .should(s -> s.term(t -> t.field("uuid").value(v -> v.stringValue(sessionId))))
            .should(s -> s.match(m -> m.field("filePath").query(sessionId)))
            .minimumShouldMatch("1");
        Query query = Query.of(q -> q.bool(bool.build()));

        long totalDeleted = 0L;

        // Enumerate all indices and filter out system/internal ones
        List<co.elastic.clients.elasticsearch.cat.indices.IndicesRecord> all;
        try {
            all = esClient.cat().indices(c -> c).valueBody();
        } catch (Exception e) {
            log.warn("deleteBySessionId: failed to list indices via _cat/indices: {}", e.getMessage());
            all = java.util.Collections.emptyList();
        }

        if (all.isEmpty()) {
            log.warn("deleteBySessionId: no indices found (cat empty). Nothing to delete.");
            return 0L;
        }

        for (var rec : all) {
            String index = rec.index();
            if (index == null || index.isBlank()) continue;
            // Skip system and internal indices
            if (index.startsWith(".")
                || index.startsWith("kibana")
                || index.startsWith("security")
                || index.startsWith(".security")
                || index.startsWith(".tasks")
                || index.startsWith(".monitoring")
                || index.startsWith(".kibana")
                || index.startsWith(".apm")
                || index.startsWith("apm-")
                || index.startsWith(".ds-")
            ) {
                log.debug("deleteBySessionId: skip system/internal index: {}", index);
                continue;
            }

            try {
                DeleteByQueryRequest req = new DeleteByQueryRequest.Builder()
                    .index(index)
                    .query(query)
                    .conflicts(Conflicts.Proceed)
                    .refresh(true)
                    .build();
                DeleteByQueryResponse resp = esClient.deleteByQuery(req);
                Long delBoxed = resp.deleted();
                long deleted = delBoxed != null ? delBoxed.longValue() : 0L;
                log.info("deleteBySessionId: index={}, deleted={}", index, deleted);
                totalDeleted += deleted;
            } catch (Exception e) {
                log.warn("deleteBySessionId failed on index {}: {}", index, e.getMessage());
            }
        }
        return totalDeleted;
    }
}