package com.example.web_service.service.impl;

import com.example.web_service.model.ai.AiRequest;
import com.example.web_service.service.AiService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;

@Service
public class AiServiceImpl implements AiService {

    private static final Logger log = LoggerFactory.getLogger(AiServiceImpl.class);

    @Value("${ai.base-url:http://192.168.0.66:11434}")
    private String aiBaseUrl;

    @Value("${ai.default-model:deepseek-r1:7b}")
    private String defaultModel;

    private final ObjectMapper objectMapper;

    public AiServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public ResponseEntity<StreamingResponseBody> generate(AiRequest request) {
        String url = aiBaseUrl + "/api/generate";
        
        try {
            String jsonBody = objectMapper.writeValueAsString(request);
            
            log.info("AI Request URL: {}", url);
            log.info("AI Request Body: {}", jsonBody);
            
            StreamingResponseBody stream = outputStream -> {
                HttpURLConnection connection = null;
                try {
                    log.info("Creating connection to: {}", url);
                    connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
                    connection.setRequestMethod("POST");
                    connection.setRequestProperty("Content-Type", "application/json");
                    connection.setRequestProperty("Accept", "application/json");
                    connection.setRequestProperty("User-Agent", "SpringBoot-AI-Client/1.0");
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
                        outputStream.write(String.format("{\"error\": \"AI service returned code %d: %s\"}\n", 
                                responseCode, errorMessage).getBytes("UTF-8"));
                        return;
                    }
                    
                    // 读取响应流并转发
                    log.info("Reading response stream...");
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(connection.getInputStream(), "UTF-8"))) {
                        String line;
                        int lineCount = 0;
                        while ((line = reader.readLine()) != null) {
                            lineCount++;
                            if (lineCount <= 5) {
                                log.debug("Response line {}: {}", lineCount, line);
                            }
                            outputStream.write((line + "\n").getBytes("UTF-8"));
                            outputStream.flush();
                        }
                        log.info("Finished reading {} lines from AI service", lineCount);
                    }
                    
                } catch (java.net.SocketException e) {
                    log.error("Socket connection error: {}", e.getMessage());
                    // 检查是否是服务器主动关闭连接
                    if (e.getMessage().contains("Unexpected end of file")) {
                        log.warn("AI service closed connection unexpectedly. This might be normal for streaming responses.");
                        outputStream.write("{\"done\": true, \"note\": \"Stream completed\"}\n".getBytes("UTF-8"));
                    } else {
                        throw e;
                    }
                } catch (Exception e) {
                    log.error("Error streaming AI response: {}", e.getMessage(), e);
                    try {
                        String errorResponse = String.format("{\"error\": \"%s\"}\n", 
                                e.getMessage().replace("\"", "\\\""));
                        outputStream.write(errorResponse.getBytes("UTF-8"));
                        outputStream.flush();
                    } catch (Exception writeError) {
                        log.error("Failed to write error response", writeError);
                    }
                } finally {
                    if (connection != null) {
                        try {
                            connection.disconnect();
                            log.debug("Connection disconnected");
                        } catch (Exception e) {
                            log.warn("Error disconnecting: {}", e.getMessage());
                        }
                    }
                }
            };
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            headers.set("Cache-Control", "no-cache");
            headers.set("Connection", "keep-alive");
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(stream);
                    
        } catch (Exception e) {
            log.error("Failed to call AI service: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to call AI service: " + e.getMessage(), e);
        }
    }

    @Override
    public ResponseEntity<StreamingResponseBody> generateWithPrompt(String prompt) {
        AiRequest request = new AiRequest();
        request.setModel(defaultModel);
        request.setPrompt(prompt);
        request.setStream(true);
        
        return generate(request);
    }

    /**
     * 检查AI服务是否可用
     */
    public boolean isAiServiceAvailable() {
        String url = aiBaseUrl + "/api/tags";
        
        try {
            log.info("Checking AI service availability at: {}", url);
            HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(15000); // 增加到15秒连接超时
            connection.setReadTimeout(30000);    // 增加到30秒读取超时
            
            long startTime = System.currentTimeMillis();
            int responseCode = connection.getResponseCode();
            long endTime = System.currentTimeMillis();
            
            connection.disconnect();
            
            boolean available = responseCode == 200;
            log.info("AI service health check: {} (response code: {}, time: {}ms)", 
                    available ? "AVAILABLE" : "UNAVAILABLE", responseCode, endTime - startTime);
            return available;
            
        } catch (java.net.SocketTimeoutException e) {
            log.warn("AI service health check timeout: {} - This might indicate network issues or slow AI service", e.getMessage());
            return false;
        } catch (java.net.ConnectException e) {
            log.warn("AI service connection refused: {} - AI service might be down", e.getMessage());
            return false;
        } catch (java.net.UnknownHostException e) {
            log.warn("AI service host unknown: {} - Check hostname/IP configuration", e.getMessage());
            return false;
        } catch (Exception e) {
            log.warn("AI service health check failed: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            return false;
        }
    }

    /**
     * 诊断AI服务连接问题
     */
    public String diagnoseAiService() {
        StringBuilder diagnosis = new StringBuilder();
        diagnosis.append("AI Service Diagnosis:\n");
        diagnosis.append("Base URL: ").append(aiBaseUrl).append("\n");
        diagnosis.append("Default Model: ").append(defaultModel).append("\n");
        
        // 测试基本连接
        try {
            URI uri = URI.create(aiBaseUrl);
            diagnosis.append("URL Parse: OK\n");
            diagnosis.append("Host: ").append(uri.getHost()).append("\n");
            diagnosis.append("Port: ").append(uri.getPort()).append("\n");
        } catch (Exception e) {
            diagnosis.append("URL Parse Error: ").append(e.getMessage()).append("\n");
            return diagnosis.toString();
        }
        
        // 测试健康检查端点
        String healthUrl = aiBaseUrl + "/api/tags";
        try {
            HttpURLConnection connection = (HttpURLConnection) URI.create(healthUrl).toURL().openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            
            long startTime = System.currentTimeMillis();
            int responseCode = connection.getResponseCode();
            long endTime = System.currentTimeMillis();
            
            diagnosis.append("Health Check URL: ").append(healthUrl).append("\n");
            diagnosis.append("Response Code: ").append(responseCode).append("\n");
            diagnosis.append("Response Time: ").append(endTime - startTime).append("ms\n");
            
            if (responseCode == 200) {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream()))) {
                    String response = reader.readLine();
                    diagnosis.append("Response Preview: ").append(response != null ? response.substring(0, Math.min(100, response.length())) : "null").append("\n");
                }
            } else {
                try (var errorStream = connection.getErrorStream()) {
                    if (errorStream != null) {
                        String error = new String(errorStream.readAllBytes(), "UTF-8");
                        diagnosis.append("Error Response: ").append(error.substring(0, Math.min(200, error.length()))).append("\n");
                    }
                }
            }
            
            connection.disconnect();
            
        } catch (Exception e) {
            diagnosis.append("Health Check Error: ").append(e.getClass().getSimpleName()).append(" - ").append(e.getMessage()).append("\n");
        }
        
        return diagnosis.toString();
    }
}
