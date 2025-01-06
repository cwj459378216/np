package com.example.web_service.service.impl;

import com.example.web_service.exception.NetworkCaptureException;
import com.example.web_service.model.capture.CaptureRequest;
import com.example.web_service.model.capture.CaptureResponse;
import com.example.web_service.model.capture.InterfaceInfo;
import com.example.web_service.service.NetworkCaptureService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.Collections;

@Service
@RequiredArgsConstructor
public class NetworkCaptureServiceImpl implements NetworkCaptureService {

    private static final Logger log = LoggerFactory.getLogger(NetworkCaptureServiceImpl.class);

    @Value("${third-party.base-url:http://192.168.0.3:8081}")
    private String baseUrl;

    private final RestTemplate restTemplate;

    @Override
    public List<InterfaceInfo> getInterfaces() {
        String url = baseUrl + "/interfaces";
        return restTemplate.exchange(url, HttpMethod.GET, null, 
            new ParameterizedTypeReference<Map<String, List<InterfaceInfo>>>() {})
            .getBody()
            .get("interfaces");
    }

    @Override
    public CaptureResponse startCapture(CaptureRequest request) {
        try {
            String url = baseUrl + "/startCapture";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
            
            ObjectMapper mapper = new ObjectMapper();
            String jsonBody = mapper.writeValueAsString(request);
            log.info("Request URL: {}", url);
            log.info("Request Headers: {}", headers);
            log.info("Request Body: {}", jsonBody);
            
            return restTemplate.postForObject(url, jsonBody, CaptureResponse.class);
        } catch (Exception e) {
            throw new NetworkCaptureException("Failed to start capture", e);
        }
    }

    @Override
    public CaptureResponse stopCapture(String sessionId) {
        String url = baseUrl + "/stopCapture?sessionid=" + sessionId;
        return restTemplate.getForObject(url, CaptureResponse.class);
    }

    @Override
    public CaptureResponse getSessionInfo(String sessionId) {
        String url = baseUrl + "/getSessionInfo?sessionid=" + sessionId;
        return restTemplate.getForObject(url, CaptureResponse.class);
    }
} 