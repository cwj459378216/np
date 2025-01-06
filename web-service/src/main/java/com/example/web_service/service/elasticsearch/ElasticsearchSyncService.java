package com.example.web_service.service.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import co.elastic.clients.json.JsonData;
import com.example.web_service.model.es.ConnRecord;

@Service
public class ElasticsearchSyncService {

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
                .toList();
    }

    public List<JsonData> searchRaw(String index, Query query) throws IOException {
        SearchResponse<JsonData> response = esClient.search(s -> s
                .index(index)
                .query(query)
                .size(100),
                JsonData.class
        );
        
        return response.hits().hits().stream()
                .map(hit -> hit.source())
                .filter(source -> source != null)
                .toList();
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
} 