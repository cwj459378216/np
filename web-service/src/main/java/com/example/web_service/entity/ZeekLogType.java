package com.example.web_service.entity;

import lombok.Data;
import java.util.List;

@Data
public class ZeekLogType {
    private String logName;
    private Boolean needBeginAttr;
    private Boolean needEndAttr;
    private List<ZeekLogAttribute> attribute;
} 