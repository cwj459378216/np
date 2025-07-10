package com.example.web_service.controller;

import com.example.web_service.model.capture.CaptureRequest;
import com.example.web_service.model.capture.CaptureResponse;
import com.example.web_service.model.capture.InterfaceInfo;
import com.example.web_service.service.NetworkCaptureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/capture")
@Tag(name = "网络抓包接口", description = "用于网络接口查询和抓包操作")
@RequiredArgsConstructor
public class NetworkCaptureController {

    private final NetworkCaptureService networkCaptureService;

    @GetMapping("/interfaces")
    @Operation(summary = "获取网络接口信息", description = "获取所有可用的网络接口信息")
    public List<InterfaceInfo> getInterfaces() {
        return networkCaptureService.getInterfaces();
    }

    @PostMapping("/startCapture")
    @Operation(summary = "开始抓包", description = "开始网络抓包任务", 
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(examples = @ExampleObject(value = 
                "{\n" +
                "  \"filter\": {\n" +
                "    \"capture\": {\n" +
                "      \"items\": [\"192.168.0.24/24;192.168.0.1\"],\n" +
                "      \"optReverse\": true\n" +
                "    }\n" +
                "  },\n" +
                "  \"index\": 0,\n" +
                "  \"port\": \"0x1\",\n" +
                "  \"appOpt\": {\n" +
                "    \"apps\": [\"zeek\"],\n" +
                "    \"zeek\": {\n" +
                "      \"enable\": true\n" +
                "    },\n" +
                "    \"savePacket\": {\n" +
                "      \"duration\": 0,\n" +
                "      \"enable\": true,\n" +
                "      \"fileCount\": 0,\n" +
                "      \"fileName\": \"string\",\n" +
                "      \"fileSize\": 0,\n" +
                "      \"fileType\": 0,\n" +
                "      \"performanceMode\": \"string\",\n" +
                "      \"stopOnWrap\": true\n" +
                "    },\n" +
                "    \"snort\": {\n" +
                "      \"enable\": true\n" +
                "    }\n" +
                "  }\n" +
                "}"
            ))))
    public CaptureResponse startCapture(@RequestBody CaptureRequest request) {
        return networkCaptureService.startCapture(request);
    }

    @GetMapping("/stopCapture")
    @Operation(summary = "停止抓包", description = "停止指定会话的抓包任务")
    public CaptureResponse stopCapture(@RequestParam String sessionid) {
        return networkCaptureService.stopCapture(sessionid);
    }

    @GetMapping("/getSessionInfo")
    @Operation(summary = "获取会话信息", description = "获取指定会话的信息")
    public CaptureResponse getSessionInfo(@RequestParam String sessionid) {
        return networkCaptureService.getSessionInfo(sessionid);
    }
} 