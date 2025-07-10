package com.example.web_service.controller;

import com.example.web_service.entity.NetworkInterface;
import com.example.web_service.service.NetworkInterfaceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController
@RequestMapping("/interfaces")
@Tag(name = "网络接口管理", description = "网络接口的查询和修改操作")
@CrossOrigin(origins = "*")
public class NetworkInterfaceController {

    @Autowired
    private NetworkInterfaceService networkInterfaceService;

    @GetMapping
    @Operation(summary = "获取所有接口", description = "获取系统中所有的网络接口")
    public List<NetworkInterface> getAllInterfaces() {
        return networkInterfaceService.findAll();
    }

    @GetMapping("/{interfaceName}")
    @Operation(summary = "获取单个接口", description = "根据接口名称获取特定的网络接口")
    public NetworkInterface getInterfaceByName(@PathVariable String interfaceName) {
        return networkInterfaceService.findById(interfaceName);
    }

    @PutMapping("/{interfaceName}")
    @Operation(summary = "更新接口", description = "更新已存在的网络接口配置")
    public NetworkInterface updateInterface(@PathVariable String interfaceName, @RequestBody NetworkInterface networkInterface) {
        // 确保路径参数和请求体中的接口名称一致
        networkInterface.setInterface_name(interfaceName);
        return networkInterfaceService.save(networkInterface);
    }

    @GetMapping("/search")
    @Operation(summary = "搜索接口", description = "根据关键字搜索网络接口")
    public List<NetworkInterface> searchInterfaces(@RequestParam String keyword) {
        return networkInterfaceService.search(keyword);
    }
} 