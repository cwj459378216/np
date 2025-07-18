package com.example.web_service.controller;

import com.example.web_service.model.ai.AiRequest;
import com.example.web_service.model.ai.PromptRequest;
import com.example.web_service.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/ai")
@Tag(name = "AI 接口", description = "用于 AI 模型调用和文本生成")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/generate")
    @Operation(summary = "AI 文本生成", description = "调用 AI 模型进行文本生成",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(examples = @ExampleObject(value = 
                "{\n" +
                "  \"model\": \"deepseek-r1:7b\",\n" +
                "  \"prompt\": \"写一个ES根据时间查询数据的查询语句\",\n" +
                "  \"stream\": true\n" +
                "}"
            ))))
    public ResponseEntity<StreamingResponseBody> generate(@RequestBody AiRequest request) {
        return aiService.generate(request);
    }

    @PostMapping("/generate/prompt")
    @Operation(summary = "通过prompt进行AI文本生成", description = "使用默认模型和指定的prompt进行AI文本生成",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(examples = @ExampleObject(value = 
                "{\n" +
                "  \"prompt\": \"写一个ES根据时间查询数据的查询语句\"\n" +
                "}"
            ))))
    public ResponseEntity<StreamingResponseBody> generateWithPrompt(@RequestBody PromptRequest request) {
        return aiService.generateWithPrompt(request.getPrompt());
    }

    @GetMapping("/generate/prompt")
    @Operation(summary = "通过GET方式进行AI文本生成", description = "使用GET方式和查询参数进行AI文本生成")
    public ResponseEntity<StreamingResponseBody> generateWithPromptGet(
            @Parameter(description = "用户输入的提示词", example = "写一个ES根据时间查询数据的查询语句")
            @RequestParam String prompt) {
        return aiService.generateWithPrompt(prompt);
    }

    @GetMapping("/health")
    @Operation(summary = "AI服务健康检查", description = "检查AI服务是否可用")
    public ResponseEntity<String> healthCheck() {
        // 使用类型转换来访问实现类的方法
        if (aiService instanceof com.example.web_service.service.impl.AiServiceImpl) {
            com.example.web_service.service.impl.AiServiceImpl impl = 
                (com.example.web_service.service.impl.AiServiceImpl) aiService;
            boolean available = impl.isAiServiceAvailable();
            
            if (available) {
                return ResponseEntity.ok("AI service is available");
            } else {
                return ResponseEntity.status(503).body("AI service is unavailable");
            }
        }
        return ResponseEntity.status(500).body("Unable to check AI service status");
    }
    
    @GetMapping("/diagnose")
    @Operation(summary = "AI服务诊断", description = "诊断AI服务连接问题")
    public ResponseEntity<String> diagnose() {
        // 使用类型转换来访问实现类的方法
        if (aiService instanceof com.example.web_service.service.impl.AiServiceImpl) {
            com.example.web_service.service.impl.AiServiceImpl impl = 
                (com.example.web_service.service.impl.AiServiceImpl) aiService;
            String diagnosis = impl.diagnoseAiService();
            return ResponseEntity.ok(diagnosis);
        }
        return ResponseEntity.status(500).body("Unable to diagnose AI service");
    }

}
