package com.example.web_service.service;

import com.example.web_service.model.capture.CaptureRequest;
import com.example.web_service.model.capture.CaptureResponse;
import com.example.web_service.model.capture.InterfaceInfo;

import java.util.List;

public interface NetworkCaptureService {
    List<InterfaceInfo> getInterfaces();
    CaptureResponse startCapture(CaptureRequest request);
    CaptureResponse stopCapture(String sessionId);
    CaptureResponse getSessionInfo(String sessionId);
} 