package com.example.web_service.service.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchAsyncClient;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.json.JsonData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.Optional;

@Service
public class ElasticsearchAsyncService {

    @Autowired
    private ElasticsearchAsyncClient esAsyncClient;

    public <T> CompletableFuture<SearchResponse<T>> searchAsync(SearchRequest request, Class<T> tClass) {
        return esAsyncClient.search(request, tClass);
    }

    public <T> CompletableFuture<List<T>> searchListAsync(String index, Query query, Class<T> tClass) {
        return esAsyncClient.search(s -> s
                .index(index)
                .query(query),
                tClass
        ).thenApply(response -> 
            response.hits().hits().stream()
                .map(hit -> hit.source())
                .toList()
        );
    }

    public CompletableFuture<Map<String, Object>> searchRawAsync(String index, Query query) {
        return esAsyncClient.search(s -> s
                .index(index)
                .query(query)
                .size(1),
                JsonData.class
        ).thenApply(response -> 
            Optional.ofNullable(response)
                .map(SearchResponse::hits)
                .map(hits -> hits.hits())
                .filter(hits -> !hits.isEmpty())
                .map(hits -> hits.get(0))
                .map(hit -> hit.source())
                .map(source -> {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> result = source.to(Map.class);
                    return result;
                })
                .orElse(Map.of())
        );
    }
} 