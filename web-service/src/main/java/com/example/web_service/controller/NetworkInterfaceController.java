package com.example.web_service.controller;

import com.example.web_service.entity.NetworkInterface;
import com.example.web_service.service.NetworkInterfaceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController
@RequestMapping("/api/interfaces")
@Tag(name = "网络接口管理", description = "网络接口的增删改查操作")
@CrossOrigin(origins = "*")
public class NetworkInterfaceController {

    @Autowired
    private NetworkInterfaceService networkInterfaceService;

    @GetMapping
    @Operation(summary = "获取所有接口", description = "获取系统中所有的网络接口")
    public List<NetworkInterface> getAllInterfaces() {
        return networkInterfaceService.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取单个接口", description = "根据ID获取特定的网络接口")
    public NetworkInterface getInterfaceById(@PathVariable Long id) {
        return networkInterfaceService.findById(id);
    }

    @PostMapping
    @Operation(summary = "创建接口", description = "创建新的网络接口")
    public NetworkInterface createInterface(@RequestBody NetworkInterface networkInterface) {
        return networkInterfaceService.save(networkInterface);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新接口", description = "更新已存在的网络接口")
    public NetworkInterface updateInterface(@PathVariable Long id, @RequestBody NetworkInterface networkInterface) {
        networkInterface.setId(id);
        return networkInterfaceService.save(networkInterface);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除接口", description = "删除指定的网络接口")
    public void deleteInterface(@PathVariable Long id) {
        networkInterfaceService.deleteById(id);
    }

    @GetMapping("/search")
    @Operation(summary = "搜索接口", description = "根据关键字搜索网络接口")
    public List<NetworkInterface> searchInterfaces(@RequestParam String keyword) {
        return networkInterfaceService.search(keyword);
    }
} 