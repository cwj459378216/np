package com.example.web_service.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class ZeekLogsConfig {
    @JsonProperty("BeginAttr")
    private List<ZeekLogAttribute> beginAttr;
    
    @JsonProperty("EndAttr")
    private List<ZeekLogAttribute> endAttr;
    
    @JsonProperty("Zeek")
    private List<ZeekLogType> zeek;
} 