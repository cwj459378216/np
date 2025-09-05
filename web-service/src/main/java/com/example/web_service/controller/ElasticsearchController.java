package com.example.web_service.controller;

import com.example.web_service.model.es.ConnRecord;
import com.example.web_service.model.es.TrendingData;
import com.example.web_service.service.elasticsearch.ElasticsearchSyncService;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.json.JsonData;
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

    private static final String INDEX_NAME = "conn-realtime";

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
            @RequestParam(defaultValue = "1h") String interval
    ) throws IOException {
        return elasticsearchSyncService.getTrending(startTime, endTime, filePath, index, interval);
    }

    @GetMapping("/protocol-trends")
    @Operation(summary = "查询协议交易趋势", description = "获取HTTP、DNS和其他协议的趋势数据，时间参数使用毫秒时间戳")
    public Map<String, List<TrendingData>> getProtocolTrends(
            @RequestParam Long startTime,
            @RequestParam Long endTime,
            @RequestParam(defaultValue = "1h") String interval
    ) throws IOException {
        return elasticsearchSyncService.getProtocolTrends(startTime, endTime, interval);
    }

    @GetMapping("/bandwidth-trends")
    @Operation(summary = "查询带宽趋势", description = "获取所有可用Channel的带宽利用率趋势数据，时间参数使用毫秒时间戳")
    public Map<String, List<TrendingData>> getBandwidthTrends(
            @RequestParam Long startTime,
            @RequestParam Long endTime,
            @RequestParam(defaultValue = "1h") String interval
    ) throws IOException {
        log.info("Received bandwidth trends request - startTime: {}, endTime: {}, interval: {}", startTime, endTime, interval);
        Map<String, List<TrendingData>> result = elasticsearchSyncService.getBandwidthTrends(startTime, endTime, interval);
        log.info("Returning bandwidth trends with {} channels", result.size());
        return result;
    }

    @GetMapping("/service-name-aggregation")
    @Operation(summary = "查询服务名称聚合数据", description = "获取conn-realtime索引中serviceName字段的Top N聚合统计数据")
    public Map<String, Object> getServiceNameAggregation(
            @RequestParam(defaultValue = "10") Integer topN
    ) throws IOException {
        log.info("Received service name aggregation request - topN: {}", topN);
        Map<String, Object> result = elasticsearchSyncService.getServiceNameAggregation(topN);
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
            @RequestParam(defaultValue = "0") Integer from
    ) throws IOException {
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

        return elasticsearchSyncService.searchRawWithPagination(index, query, size, from);
    }
} 