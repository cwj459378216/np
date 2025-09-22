package com.example.web_service.model.capture;

import lombok.Data;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonInclude;

@Data
public class CaptureRequest {
    private Filter filter;
    private Integer index;
    private String port;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String filePath;
    private AppOpt appOpt;

    @Data
    public static class Filter {
        private CaptureFilter capture;
    }

    @Data
    public static class CaptureFilter {
        private List<String> items;
        private Boolean optReverse;
    }

    @Data
    public static class AppOpt {
        private List<String> apps;
        private ZeekOpt zeek;
        private SavePacketOpt savePacket;
        private SuricataOpt suricata; // 新增：独立的 Suricata 配置
        private SnortOpt snort;       // 保留 snort 以兼容旧字段
    }

    @Data
    public static class ZeekOpt {
        private Boolean enable;
    }

    @Data
    public static class SuricataOpt { // 新增：Suricata 配置
        private Boolean enable;
    }

    @Data
    public static class SavePacketOpt {
        private Integer duration;
        private Boolean enable;
        private Integer fileCount;
        private String fileName;
        private Integer fileSize;
        private Integer fileType;
        private String performanceMode;
        private Boolean stopOnWrap;
    }

    @Data
    public static class SnortOpt {
        private Boolean enable;
    }
}