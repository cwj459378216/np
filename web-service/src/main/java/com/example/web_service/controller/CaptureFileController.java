package com.example.web_service.controller;

import com.example.web_service.dto.CaptureFileDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/capture-files")
@Tag(name = "抓包文件", description = "列出与下载抓包目录下的文件")
@RequiredArgsConstructor
public class CaptureFileController {

    // 目标目录，按需求也可以迁移到配置文件
    private static final String BASE_DIR = "/datastore/neteyez/datastore/pcap/capture/";

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_INSTANT;

    @GetMapping
    @Operation(summary = "列出抓包文件", description = "返回目录下的文件名、大小与创建时间")
    public List<CaptureFileDto> list(@RequestParam(value = "path", required = false) String path) throws Exception {
        String root = StringUtils.hasText(path) ? path : BASE_DIR;
        Path dir = Paths.get(root);
        if (!Files.exists(dir) || !Files.isDirectory(dir)) {
            return new ArrayList<>();
        }
    try (java.util.stream.Stream<Path> stream = Files.list(dir)) {
        return stream
            .filter(Files::isRegularFile)
            .sorted(Comparator.comparingLong((Path p) -> p.toFile().lastModified()).reversed())
            .map(this::toDto)
            .collect(Collectors.toList());
    }
    }

    private CaptureFileDto toDto(Path p) {
        File f = p.toFile();
        long size = f.length();
        Instant created = Instant.ofEpochMilli(f.lastModified());
        return new CaptureFileDto(f.getName(), size, ISO.format(created));
    }

    @GetMapping("/download/{file}")
    @Operation(summary = "下载抓包文件", description = "按文件名在固定目录下下载文件")
    public ResponseEntity<Resource> download(@PathVariable("file") String file,
                                             @RequestParam(value = "path", required = false) String path) throws Exception {
        String root = StringUtils.hasText(path) ? path : BASE_DIR;
        // 简单防路径穿越：仅允许单层文件名
        if (file.contains("/") || file.contains("..")) {
            return ResponseEntity.badRequest().build();
        }
        Path p = Paths.get(root, file);
        if (!Files.exists(p) || !Files.isRegularFile(p)) {
            return ResponseEntity.notFound().build();
        }
        FileSystemResource resource = new FileSystemResource(p);
        String encoded = URLEncoder.encode(file, StandardCharsets.UTF_8).replaceAll("\\+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encoded + "\"")
                .contentLength(resource.contentLength())
                .body(resource);
    }
}
