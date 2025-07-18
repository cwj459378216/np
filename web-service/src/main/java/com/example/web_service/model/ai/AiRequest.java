package com.example.web_service.model.ai;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class AiRequest {
    private String model;
    private String prompt;
    
    @JsonProperty("stream")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean stream;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer temperature;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer maxTokens;
}
