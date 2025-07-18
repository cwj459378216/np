package com.example.web_service.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class ZeekLogAttribute {
    @JsonProperty("keyWord")
    private String keyWord;
    
    @JsonProperty("keyAlias")
    private String keyAlias;
    
    @JsonProperty("keyType")
    private String keyType;
    
    @JsonProperty("defaultShow")
    private Boolean defaultShow;
    
    @JsonProperty(value = "description")
    private String description;
    
    @JsonProperty("extended")
    private Boolean extended;
} 