package com.example.web_service.exception;

public class NetworkCaptureException extends RuntimeException {
    public NetworkCaptureException(String message) {
        super(message);
    }

    public NetworkCaptureException(String message, Throwable cause) {
        super(message, cause);
    }
} 