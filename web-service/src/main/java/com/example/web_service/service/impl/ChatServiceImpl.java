package com.example.web_service.service.impl;

import com.example.web_service.model.chat.ChatMessage;
import com.example.web_service.model.chat.ChatRequest;
import com.example.web_service.model.chat.ChatResponse;
import com.example.web_service.model.chat.ChatSession;
import com.example.web_service.service.ChatService;
import com.example.web_service.service.AiService;
import com.example.web_service.model.ai.AiRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChatServiceImpl implements ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatServiceImpl.class);
    
    private final AiService aiService;
    private final ObjectMapper objectMapper;
    
    @Value("${ai.base-url:http://192.168.0.66:11434}")
    private String aiBaseUrl;
    
    @Value("${ai.default-model:deepseek-r1:7b}")
    private String defaultModel;
    
    // 内存存储，生产环境应该使用数据库
    private final Map<String, List<ChatMessage>> chatHistory = new ConcurrentHashMap<>();
    private final Map<String, ChatSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, List<String>> userSessions = new ConcurrentHashMap<>();

    public ChatServiceImpl(AiService aiService, ObjectMapper objectMapper) {
        this.aiService = aiService;
        this.objectMapper = objectMapper;
    }

    @Override
    public ChatResponse processMessage(ChatRequest request) {
        long startTime = System.currentTimeMillis();
        
        try {
            log.info("Processing chat message: {}", request.getMessage());
            
            // 保存用户消息
            ChatMessage userMessage = createChatMessage(request, true);
            saveMessage(userMessage);
            
            // 调用真实的AI服务
            String aiResponse = callRealAiService(request);
            
            // 保存AI回复
            ChatMessage aiMessage = createChatMessage(request, false);
            aiMessage.setContent(aiResponse);
            aiMessage.setAiModel(request.getAiModel() != null ? request.getAiModel() : defaultModel);
            saveMessage(aiMessage);
            
            // 更新会话最后活动时间
            updateSessionActivity(request.getSessionId());
            
            long responseTime = System.currentTimeMillis() - startTime;
            
            return ChatResponse.builder()
                    .messageId(aiMessage.getId())
                    .sessionId(request.getSessionId())
                    .content(aiResponse)
                    .aiModel(request.getAiModel() != null ? request.getAiModel() : defaultModel)
                    .timestamp(LocalDateTime.now())
                    .responseTime(responseTime)
                    .success(true)
                    .build();
                    
        } catch (Exception e) {
            log.error("Error processing chat message", e);
            return ChatResponse.builder()
                    .messageId(UUID.randomUUID().toString())
                    .sessionId(request.getSessionId())
                    .content("抱歉，处理您的消息时出现错误。")
                    .error(e.getMessage())
                    .success(false)
                    .build();
        }
    }

    @Override
    public ResponseEntity<StreamingResponseBody> processMessageStream(ChatRequest request) {
        try {
            log.info("Processing streaming chat message: {}", request.getMessage());
            
            // 保存用户消息
            ChatMessage userMessage = createChatMessage(request, true);
            saveMessage(userMessage);
            
            // 创建流式响应
            StreamingResponseBody responseBody = outputStream -> {
                try {
                    // 调用AI服务获取流式响应
                    callRealAiServiceStream(request, outputStream);
                } catch (Exception e) {
                    log.error("Error in streaming response", e);
                    String errorResponse = "data: {\"error\": \"" + e.getMessage() + "\"}\n\n";
                    outputStream.write(errorResponse.getBytes("UTF-8"));
                }
            };
            
            return ResponseEntity.ok()
                    .header("Content-Type", "text/plain; charset=UTF-8")
                    .header("Cache-Control", "no-cache")
                    .header("Connection", "keep-alive")
                    .body(responseBody);
                    
        } catch (Exception e) {
            log.error("Error processing streaming chat message", e);
            return ResponseEntity.status(500).build();
        }
    }

    @Override
    public List<ChatMessage> getChatHistory(String sessionId) {
        return chatHistory.getOrDefault(sessionId, new ArrayList<>());
    }

    @Override
    public List<ChatSession> getUserSessions(String userId) {
        List<String> sessionIds = userSessions.getOrDefault(userId, new ArrayList<>());
        List<ChatSession> userSessionsList = new ArrayList<>();
        
        for (String sessionId : sessionIds) {
            ChatSession session = sessions.get(sessionId);
            if (session != null) {
                userSessionsList.add(session);
            }
        }
        
        return userSessionsList;
    }

    @Override
    public ChatSession createSession(String userId) {
        String sessionId = UUID.randomUUID().toString();
        String title = "新对话 " + LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("MM-dd HH:mm"));
        
        ChatSession session = ChatSession.builder()
                .id(sessionId)
                .userId(userId)
                .title(title)
                .createdAt(LocalDateTime.now())
                .lastActivityAt(LocalDateTime.now())
                .messageCount(0)
                .status("active")
                .aiModel(defaultModel)
                .build();
        
        sessions.put(sessionId, session);
        chatHistory.put(sessionId, new ArrayList<>());
        
        // 添加到用户会话列表
        userSessions.computeIfAbsent(userId, k -> new ArrayList<>()).add(sessionId);
        
        log.info("Created new chat session: {} for user: {}", sessionId, userId);
        return session;
    }

    @Override
    public void deleteSession(String sessionId) {
        ChatSession session = sessions.get(sessionId);
        if (session != null) {
            // 从用户会话列表中移除
            List<String> userSessionList = userSessions.get(session.getUserId());
            if (userSessionList != null) {
                userSessionList.remove(sessionId);
            }
            
            // 删除会话和聊天历史
            sessions.remove(sessionId);
            chatHistory.remove(sessionId);
            
            log.info("Deleted chat session: {}", sessionId);
        }
    }

    @Override
    public Object getChatAnalytics(String userId) {
        List<ChatSession> userSessionList = getUserSessions(userId);
        
        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalSessions", userSessionList.size());
        analytics.put("totalMessages", 0);
        analytics.put("activeSessions", 0);
        analytics.put("averageMessagesPerSession", 0.0);
        
        if (!userSessionList.isEmpty()) {
            int totalMessages = 0;
            int activeSessions = 0;
            
            for (ChatSession session : userSessionList) {
                List<ChatMessage> messages = chatHistory.get(session.getId());
                if (messages != null) {
                    totalMessages += messages.size();
                }
                
                if ("active".equals(session.getStatus())) {
                    activeSessions++;
                }
            }
            
            analytics.put("totalMessages", totalMessages);
            analytics.put("activeSessions", activeSessions);
            analytics.put("averageMessagesPerSession", 
                    userSessionList.size() > 0 ? (double) totalMessages / userSessionList.size() : 0.0);
        }
        
        return analytics;
    }

    private ChatMessage createChatMessage(ChatRequest request, boolean isUser) {
        return ChatMessage.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(request.getSessionId())
                .userId(request.getUserId())
                .content(request.getMessage())
                .isUser(isUser)
                .timestamp(LocalDateTime.now())
                .build();
    }

    private void saveMessage(ChatMessage message) {
        chatHistory.computeIfAbsent(message.getSessionId(), k -> new ArrayList<>()).add(message);
    }

    private void updateSessionActivity(String sessionId) {
        ChatSession session = sessions.get(sessionId);
        if (session != null) {
            session.setLastActivityAt(LocalDateTime.now());
            session.setMessageCount(chatHistory.getOrDefault(sessionId, new ArrayList<>()).size());
        }
    }

    /**
     * 调用真实的AI服务，参考AiServiceImpl的实现
     * 支持连续对话，包含对话历史上下文
     */
    private String callRealAiService(ChatRequest request) {
        String url = aiBaseUrl + "/api/generate";
        
        try {
            // 构建包含对话历史的完整提示词
            String fullPrompt = buildConversationPrompt(request);
            
            // 创建AI请求
            AiRequest aiRequest = new AiRequest();
            aiRequest.setModel(request.getAiModel() != null ? request.getAiModel() : defaultModel);
            aiRequest.setPrompt(fullPrompt);
            aiRequest.setStream(false); // 聊天服务使用非流式响应
            
            if (request.getMaxTokens() != null) {
                aiRequest.setMaxTokens(request.getMaxTokens());
            }
            
            if (request.getTemperature() != null) {
                aiRequest.setTemperature(request.getTemperature().intValue());
            }
            
            String jsonBody = objectMapper.writeValueAsString(aiRequest);
            
            log.info("AI Request URL: {}", url);
            log.info("AI Request Body: {}", jsonBody);
            
            // 创建HTTP连接
            HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "SpringBoot-Chat-Client/1.0");
            connection.setDoOutput(true);
            connection.setConnectTimeout(30000); // 30秒连接超时
            connection.setReadTimeout(300000);   // 5分钟读取超时
            
            log.info("Sending request to AI service...");
            // 发送请求体
            try (var os = connection.getOutputStream()) {
                os.write(jsonBody.getBytes("UTF-8"));
                os.flush();
            }
            
            int responseCode = connection.getResponseCode();
            log.info("AI service response code: {}", responseCode);
            
            if (responseCode != 200) {
                String errorMessage = "";
                try (var errorStream = connection.getErrorStream()) {
                    if (errorStream != null) {
                        errorMessage = new String(errorStream.readAllBytes(), "UTF-8");
                    }
                }
                log.error("AI service error response: {}", errorMessage);
                throw new RuntimeException("AI service returned code " + responseCode + ": " + errorMessage);
            }
            
            // 读取响应
            log.info("Reading AI service response...");
            StringBuilder responseBuilder = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    
                    try {
                        // 尝试解析JSON响应
                        Map<String, Object> data = objectMapper.readValue(line, Map.class);
                        if (data.containsKey("response")) {
                            String responseContent = (String) data.get("response");
                            // 过滤掉<think>标签内容
                            String cleanedContent = filterThinkTags(responseContent);
                            responseBuilder.append(cleanedContent);
                        } else if (data.containsKey("error")) {
                            throw new RuntimeException("AI service error: " + data.get("error"));
                        }
                    } catch (Exception e) {
                        // 如果不是JSON格式，直接添加内容（也要过滤<think>标签）
                        log.debug("Non-JSON response line: {}", line);
                        String cleanedLine = filterThinkTags(line);
                        responseBuilder.append(cleanedLine).append("\n");
                    }
                }
            }
            
            connection.disconnect();
            
            String response = responseBuilder.toString().trim();
            if (response.isEmpty()) {
                response = "抱歉，AI服务没有返回有效回复。";
            }
            
            log.info("AI service response received, length: {}", response.length());
            return response;
            
        } catch (java.net.SocketTimeoutException e) {
            log.error("AI service timeout: {}", e.getMessage());
            throw new RuntimeException("AI服务响应超时，请稍后重试");
        } catch (java.net.ConnectException e) {
            log.error("AI service connection refused: {}", e.getMessage());
            throw new RuntimeException("无法连接到AI服务，请检查服务状态");
        } catch (java.net.UnknownHostException e) {
            log.error("AI service host unknown: {}", e.getMessage());
            throw new RuntimeException("AI服务地址无效，请检查配置");
        } catch (Exception e) {
            log.error("Error calling AI service: {}", e.getMessage(), e);
            throw new RuntimeException("调用AI服务时出现错误: " + e.getMessage());
        }
    }

    /**
     * 构建包含对话历史的完整提示词
     * 支持连续对话，保持上下文连续性
     */
    private String buildConversationPrompt(ChatRequest request) {
        StringBuilder promptBuilder = new StringBuilder();
        
        // 添加系统角色设定
        promptBuilder.append("你是一个专业的AI助手，能够帮助用户解决各种问题。请根据对话历史提供连贯、准确的回答。\n\n");
        
        // 获取对话历史（限制最近的对话轮次以避免token过多）
        List<ChatMessage> history = getChatHistory(request.getSessionId());
        int maxHistoryTurns = 10; // 最多保留10轮对话历史
        int startIndex = Math.max(0, history.size() - maxHistoryTurns * 2); // 每轮对话包含用户和AI两条消息
        
        if (startIndex < history.size()) {
            promptBuilder.append("对话历史：\n");
            for (int i = startIndex; i < history.size(); i++) {
                ChatMessage msg = history.get(i);
                if (msg.isUser()) {
                    promptBuilder.append("用户: ").append(msg.getContent()).append("\n");
                } else {
                    promptBuilder.append("AI助手: ").append(msg.getContent()).append("\n");
                }
            }
            promptBuilder.append("\n");
        }
        
        // 添加当前用户消息
        promptBuilder.append("用户: ").append(request.getMessage()).append("\n");
        promptBuilder.append("AI助手: ");
        
        log.debug("Built conversation prompt with {} history messages", 
                startIndex < history.size() ? history.size() - startIndex : 0);
        
        return promptBuilder.toString();
    }

    /**
     * 调用真实的AI服务，支持流式响应
     */
    private void callRealAiServiceStream(ChatRequest request, OutputStream outputStream) throws IOException {
        String url = aiBaseUrl + "/api/generate";
        
        try {
            // 构建包含对话历史的完整提示词
            String fullPrompt = buildConversationPrompt(request);
            
            // 创建AI请求
            AiRequest aiRequest = new AiRequest();
            aiRequest.setModel(request.getAiModel() != null ? request.getAiModel() : defaultModel);
            aiRequest.setPrompt(fullPrompt);
            aiRequest.setStream(true); // 启用流式响应
            
            if (request.getMaxTokens() != null) {
                aiRequest.setMaxTokens(request.getMaxTokens());
            }
            
            if (request.getTemperature() != null) {
                aiRequest.setTemperature(request.getTemperature().intValue());
            }
            
            String jsonBody = objectMapper.writeValueAsString(aiRequest);
            
            log.info("AI Stream Request URL: {}", url);
            log.info("AI Stream Request Body: {}", jsonBody);
            
            // 创建HTTP连接
            HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "SpringBoot-Chat-Client/1.0");
            connection.setDoOutput(true);
            connection.setConnectTimeout(30000); // 30秒连接超时
            connection.setReadTimeout(300000);   // 5分钟读取超时
            
            // 发送请求体
            try (OutputStream os = connection.getOutputStream()) {
                os.write(jsonBody.getBytes("UTF-8"));
                os.flush();
            }
            
            int responseCode = connection.getResponseCode();
            log.info("AI service stream response code: {}", responseCode);
            
            if (responseCode != 200) {
                String errorMessage = "";
                try (var errorStream = connection.getErrorStream()) {
                    if (errorStream != null) {
                        errorMessage = new String(errorStream.readAllBytes(), "UTF-8");
                    }
                }
                log.error("AI service stream error response: {}", errorMessage);
                String errorResponse = "data: {\"error\": \"AI service returned code " + responseCode + ": " + errorMessage + "\"}\n\n";
                outputStream.write(errorResponse.getBytes("UTF-8"));
                return;
            }
            
            // 读取流式响应
            log.info("Reading AI service stream response...");
            StringBuilder fullResponse = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    
                    try {
                        // 尝试解析JSON响应
                        Map<String, Object> data = objectMapper.readValue(line, Map.class);
                        if (data.containsKey("response")) {
                            String responseContent = (String) data.get("response");
                            // 过滤掉<think>标签内容
                            String cleanedContent = filterThinkTags(responseContent);
                            if (cleanedContent != null && !cleanedContent.isEmpty()) {
                                fullResponse.append(cleanedContent);
                                // 发送单个字符到前端
                                String charResponse = "data: {\"content\": \"" + cleanedContent + "\"}\n\n";
                                outputStream.write(charResponse.getBytes("UTF-8"));
                                outputStream.flush();
                            }
                        } else if (data.containsKey("error")) {
                            String errorResponse = "data: {\"error\": \"" + data.get("error") + "\"}\n\n";
                            outputStream.write(errorResponse.getBytes("UTF-8"));
                            outputStream.flush();
                            return;
                        }
                    } catch (Exception e) {
                        // 如果不是JSON格式，直接添加内容（也要过滤<think>标签）
                        log.debug("Non-JSON stream response line: {}", line);
                        String cleanedLine = filterThinkTags(line);
                        if (cleanedLine != null && !cleanedLine.isEmpty()) {
                            fullResponse.append(cleanedLine);
                            String charResponse = "data: {\"content\": \"" + cleanedLine + "\"}\n\n";
                            outputStream.write(charResponse.getBytes("UTF-8"));
                            outputStream.flush();
                        }
                    }
                }
            }
            
            connection.disconnect();
            
            // 保存完整的AI回复到聊天历史
            String completeResponse = fullResponse.toString().trim();
            if (!completeResponse.isEmpty()) {
                ChatMessage aiMessage = createChatMessage(request, false);
                aiMessage.setContent(completeResponse);
                aiMessage.setAiModel(request.getAiModel() != null ? request.getAiModel() : defaultModel);
                saveMessage(aiMessage);
                
                // 更新会话最后活动时间
                updateSessionActivity(request.getSessionId());
            }
            
            // 发送结束标记
            String endResponse = "data: {\"done\": true}\n\n";
            outputStream.write(endResponse.getBytes("UTF-8"));
            outputStream.flush();
            
            log.info("AI service stream response completed, total length: {}", completeResponse.length());
            
        } catch (java.net.SocketTimeoutException e) {
            log.error("AI service stream timeout: {}", e.getMessage());
            String errorResponse = "data: {\"error\": \"AI服务响应超时，请稍后重试\"}\n\n";
            outputStream.write(errorResponse.getBytes("UTF-8"));
            outputStream.flush();
        } catch (java.net.ConnectException e) {
            log.error("AI service stream connection refused: {}", e.getMessage());
            String errorResponse = "data: {\"error\": \"无法连接到AI服务，请检查服务状态\"}\n\n";
            outputStream.write(errorResponse.getBytes("UTF-8"));
            outputStream.flush();
        } catch (java.net.UnknownHostException e) {
            log.error("AI service stream host unknown: {}", e.getMessage());
            String errorResponse = "data: {\"error\": \"AI服务地址无效，请检查配置\"}\n\n";
            outputStream.write(errorResponse.getBytes("UTF-8"));
            outputStream.flush();
        } catch (Exception e) {
            log.error("Error calling AI service stream: {}", e.getMessage(), e);
            String errorResponse = "data: {\"error\": \"调用AI服务时出现错误: " + e.getMessage() + "\"}\n\n";
            outputStream.write(errorResponse.getBytes("UTF-8"));
            outputStream.flush();
        }
    }

    /**
     * 过滤掉AI响应中的<think>标签及其包含的所有内容
     */
    private String filterThinkTags(String content) {
        if (content == null) {
            return null;
        }
        // 移除<think>标签及其包含的所有内容
        return content.replaceAll("<think>.*?</think>", "").trim();
    }
}
