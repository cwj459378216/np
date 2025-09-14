package com.example.web_service.controller;

import com.example.web_service.model.es.ConnRecord;
import com.example.web_service.model.es.TrendingData;
import com.example.web_service.model.es.widget.WidgetQueryRequest;
import com.example.web_service.service.elasticsearch.ElasticsearchSyncService;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.json.JsonData;
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
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
            @RequestParam(required = false) String filePath,
            @RequestParam(defaultValue = "1h") String interval
    ) throws IOException {
        return elasticsearchSyncService.getProtocolTrends(startTime, endTime, filePath, interval);
    }

    @GetMapping("/bandwidth-trends")
    @Operation(summary = "查询带宽趋势", description = "获取所有可用Channel的带宽利用率趋势数据，时间参数使用毫秒时间戳")
    public Map<String, List<TrendingData>> getBandwidthTrends(
            @RequestParam Long startTime,
            @RequestParam Long endTime,
            @RequestParam(required = false) String filePath,
            @RequestParam(defaultValue = "1h") String interval
    ) throws IOException {
        log.info("Received bandwidth trends request - startTime: {}, endTime: {}, filePath: {}, interval: {}", startTime, endTime, filePath, interval);
        Map<String, List<TrendingData>> result = elasticsearchSyncService.getBandwidthTrends(startTime, endTime, filePath, interval);
        log.info("Returning bandwidth trends with {} channels", result.size());
        return result;
    }

    @GetMapping("/network-protocol-trends")
    @Operation(summary = "查询网络协议趋势", description = "从conn-realtime索引根据protoName统计时间序列趋势，时间参数使用毫秒时间戳")
    public Map<String, List<TrendingData>> getNetworkProtocolTrends(
            @RequestParam Long startTime,
            @RequestParam Long endTime,
            @RequestParam(required = false) String filePath,
            @RequestParam(defaultValue = "1h") String interval
    ) throws IOException {
        log.info("Received network protocol trends request - startTime: {}, endTime: {}, filePath: {}, interval: {}", startTime, endTime, filePath, interval);
        Map<String, List<TrendingData>> result = elasticsearchSyncService.getConnProtocolNameTrends(startTime, endTime, filePath, interval);
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

    @GetMapping("/query-by-filepath")
    @Operation(summary = "根据文件路径查询数据时间范围", description = "根据filePath查询数据的时间范围，返回第一条和最后一条数据的时间")
    public Map<String, Object> queryDataByFilePath(
            @RequestParam String filePath,
            @RequestParam(defaultValue = "*") String index
    ) throws IOException {
        // 构建查询条件，只根据filePath过滤，不限制时间
        Query query = Query.of(q -> q
            .bool(b -> b
                .must(m -> m
                    .match(t -> t
                        .field("filePath")
                        .query(filePath)
                    )
                )
            )
        );

        // 查询第一条数据（最早时间）- 使用升序排序
        SearchResponse<JsonData> firstResponse = esClient.search(s -> s
            .index(index)
            .query(query)
            .size(1)
            .sort(sort -> sort
                .field(f -> f
                    .field("timestamp")
                    .order(co.elastic.clients.elasticsearch._types.SortOrder.Asc)
                )
            ),
            JsonData.class
        );
        
        // 查询最后一条数据（最晚时间）- 使用降序排序
        SearchResponse<JsonData> lastResponse = esClient.search(s -> s
            .index(index)
            .query(query)
            .size(1)
            .sort(sort -> sort
                .field(f -> f
                    .field("timestamp")
                    .order(co.elastic.clients.elasticsearch._types.SortOrder.Desc)
                )
            ),
            JsonData.class
        );

        // 提取时间戳
        String firstTimestamp = null;
        String lastTimestamp = null;
        
        if (firstResponse.hits().hits().size() > 0) {
            var firstHit = firstResponse.hits().hits().get(0);
            if (firstHit.source() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> firstRecord = (Map<String, Object>) firstHit.source().to(Map.class);
                firstTimestamp = (String) firstRecord.get("timestamp");
            }
        }
        
        if (lastResponse.hits().hits().size() > 0) {
            var lastHit = lastResponse.hits().hits().get(0);
            if (lastHit.source() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> lastRecord = (Map<String, Object>) lastHit.source().to(Map.class);
                lastTimestamp = (String) lastRecord.get("timestamp");
            }
        }

        // 如果没有查询到数据，返回最近一天的时间范围
        if (firstTimestamp == null || lastTimestamp == null) {
            java.time.Instant now = java.time.Instant.now();
            java.time.Instant oneDayAgo = now.minus(java.time.Duration.ofDays(1));
            
            firstTimestamp = oneDayAgo.toString();
            lastTimestamp = now.toString();
            
            return Map.of(
                "filePath", filePath,
                "firstTimestamp", firstTimestamp,
                "lastTimestamp", lastTimestamp,
                "hasData", false,
                "isDefaultRange", true
            );
        }

        return Map.of(
            "filePath", filePath,
            "firstTimestamp", firstTimestamp,
            "lastTimestamp", lastTimestamp,
            "hasData", true,
            "isDefaultRange", false
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

    @PostMapping("/widget/query")
    @Operation(summary = "Widget数据查询", description = "根据Widget配置(索引/过滤/聚合)返回图表或表格数据, 默认最近7天")
    public Map<String,Object> widgetQuery(@RequestBody WidgetQueryRequest req) throws IOException {
        log.info("Controller received widget query request: {}", req);
        log.info("Controller yField check: '{}'", req.getYField());
        return elasticsearchSyncService.executeWidgetQuery(req);
    }
}