package com.example.web_service.model.es;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConnRecord {
    private String channelID;
    private String connState;
    
    @JsonProperty("dstIP")
    private String dstIp;
    private Long dstPort;
    private Double duration;
    private String filePath;
    private String history;
    private String localOrig;
    private String localResp;
    private Long missedBytes;
    private Long origBytes;
    private Long origIpBytes;
    private Long origPkts;
    
    @JsonProperty("orig_l2_addr")
    private String origL2Addr;
    private String proto;
    private Long respBytes;
    private Long respIpBytes;
    private Long respPkts;
    
    @JsonProperty("resp_l2_addr")
    private String respL2Addr;
    
    @JsonProperty("srcIP")
    private String srcIp;
    private Long srcPort;
    private String timestamp;
    private Double ts;
    private String uid;
} 