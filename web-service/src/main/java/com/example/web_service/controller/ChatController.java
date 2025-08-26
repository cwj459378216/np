package com.example.web_service.controller;

import com.example.web_service.model.chat.ChatMessage;
import com.example.web_service.model.chat.ChatRequest;
import com.example.web_service.model.chat.ChatResponse;
import com.example.web_service.model.chat.ChatSession;
import com.example.web_service.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.List;

@RestController
@RequestMapping("/chat")
@Tag(name = "聊天接口", description = "用于处理AI聊天相关的功能")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/send")
    @Operation(summary = "发送聊天消息", description = "发送消息给AI并获取回复",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(examples = @ExampleObject(value = 
                "{\n" +
                "  \"message\": \"如何配置防火墙规则？\",\n" +
                "  \"sessionId\": \"session123\",\n" +
                "  \"userId\": \"user123\"\n" +
                "}"
            ))))
    public ResponseEntity<ChatResponse> sendMessage(@RequestBody ChatRequest request) {
        ChatResponse response = chatService.processMessage(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/send/stream")
    @Operation(summary = "发送聊天消息(流式)", description = "发送消息给AI并获取流式回复",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(examples = @ExampleObject(value = 
                "{\n" +
                "  \"message\": \"如何配置防火墙规则？\",\n" +
                "  \"sessionId\": \"session123\",\n" +
                "  \"userId\": \"user123\"\n" +
                "}"
            ))))
    public ResponseEntity<StreamingResponseBody> sendMessageStream(@RequestBody ChatRequest request) {
        try {
            return chatService.processMessageStream(request);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/history/{sessionId}")
    @Operation(summary = "获取聊天历史", description = "根据会话ID获取聊天历史记录")
    public ResponseEntity<List<ChatMessage>> getChatHistory(
            @Parameter(description = "会话ID", example = "session123")
            @PathVariable String sessionId) {
        List<ChatMessage> history = chatService.getChatHistory(sessionId);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/sessions/{userId}")
    @Operation(summary = "获取用户会话列表", description = "获取指定用户的所有聊天会话")
    public ResponseEntity<List<ChatSession>> getUserSessions(
            @Parameter(description = "用户ID", example = "user123")
            @PathVariable String userId) {
        List<ChatSession> sessions = chatService.getUserSessions(userId);
        return ResponseEntity.ok(sessions);
    }

    @PostMapping("/session/create")
    @Operation(summary = "创建新会话", description = "为用户创建新的聊天会话")
    public ResponseEntity<ChatSession> createSession(
            @Parameter(description = "用户ID", example = "user123")
            @RequestParam String userId) {
        ChatSession session = chatService.createSession(userId);
        return ResponseEntity.ok(session);
    }

    @DeleteMapping("/session/{sessionId}")
    @Operation(summary = "删除会话", description = "删除指定的聊天会话")
    public ResponseEntity<String> deleteSession(
            @Parameter(description = "会话ID", example = "session123")
            @PathVariable String sessionId) {
        chatService.deleteSession(sessionId);
        return ResponseEntity.ok("Session deleted successfully");
    }

    @GetMapping("/analytics/{userId}")
    @Operation(summary = "获取聊天分析", description = "获取用户的聊天统计数据")
    public ResponseEntity<Object> getChatAnalytics(
            @Parameter(description = "用户ID", example = "user123")
            @PathVariable String userId) {
        Object analytics = chatService.getChatAnalytics(userId);
        return ResponseEntity.ok(analytics);
    }

    @PostMapping("/feedback")
    @Operation(summary = "提交聊天反馈", description = "用户对AI回复进行评分和反馈")
    public ResponseEntity<String> submitFeedback(
            @RequestBody Object feedback) {
        // TODO: 实现反馈处理逻辑
        return ResponseEntity.ok("Feedback submitted successfully");
    }

    @GetMapping("/health")
    @Operation(summary = "聊天服务健康检查", description = "检查聊天服务是否可用")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Chat service is running");
    }
}
