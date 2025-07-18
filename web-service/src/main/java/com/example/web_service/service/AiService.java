package com.example.web_service.service;

import com.example.web_service.model.ai.AiRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

public interface AiService {
    ResponseEntity<StreamingResponseBody> generate(AiRequest request);
    ResponseEntity<StreamingResponseBody> generateWithPrompt(String prompt);
}
