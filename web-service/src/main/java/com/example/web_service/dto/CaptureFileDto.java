package com.example.web_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CaptureFileDto {
    private String name;
    private long size;
    /**
     * ISO-8601 时间，例如 2025-09-05T12:34:56Z
     */
    private String creationTime;
}
