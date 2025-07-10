package com.example.web_service.controller;

import com.example.web_service.entity.Asset;
import com.example.web_service.service.AssetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController
@RequestMapping("/assets")
@Tag(name = "资产管理", description = "资产的增删改查操作")
@CrossOrigin(origins = "*")
public class AssetController {

    @Autowired
    private AssetService assetService;

    @GetMapping
    @Operation(summary = "获取所有资产", description = "获取系统中所有的资产记录")
    public List<Asset> getAllAssets() {
        return assetService.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取单个资产", description = "根据ID获取特定的资产记录")
    public Asset getAssetById(@PathVariable Long id) {
        return assetService.findById(id);
    }

    @PostMapping
    @Operation(summary = "创建资产", description = "创建��的资产记录")
    public Asset createAsset(@RequestBody Asset asset) {
        return assetService.save(asset);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新资产", description = "更新已存在的资产记录")
    public Asset updateAsset(@PathVariable Long id, @RequestBody Asset asset) {
        asset.setId(id);
        return assetService.save(asset);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除资产", description = "删除指定的资产记录")
    public void deleteAsset(@PathVariable Long id) {
        assetService.deleteById(id);
    }

    @GetMapping("/search")
    @Operation(summary = "搜索资产", description = "根据关键字搜索资产")
    public List<Asset> searchAssets(@RequestParam String keyword) {
        return assetService.search(keyword);
    }
} 