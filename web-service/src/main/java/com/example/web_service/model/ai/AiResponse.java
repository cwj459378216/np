package com.example.web_service.model.ai;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonInclude;

@Data
public class AiResponse {
    private String model;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String response;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean done;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Long totalDuration;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Long loadDuration;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Long promptEvalDuration;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Long evalDuration;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer promptEvalCount;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer evalCount;
}
