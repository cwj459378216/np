package com.example.web_service.model.capture;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@Data
public class InterfaceInfo {
    @JsonProperty("desc")
    private String desc;
    
    @JsonProperty("index")
    private Integer index;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("ports")
    private List<Port> ports;

    @Data
    public static class Port {
        @JsonProperty("duplex")
        private String duplex;
        
        @JsonProperty("id")
        private Integer id;
        
        @JsonProperty("mac")
        private String mac;
        
        @JsonProperty("speed")
        private String speed;
        
        @JsonProperty("state")
        private String state;
        
        @JsonProperty("type")
        private String type;
    }
} 