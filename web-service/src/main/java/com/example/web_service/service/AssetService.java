package com.example.web_service.service;

import com.example.web_service.entity.Asset;
import com.example.web_service.repository.AssetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AssetService {
    
    @Autowired
    private AssetRepository assetRepository;

    public List<Asset> findAll() {
        return assetRepository.findAll();
    }

    public Asset findById(Long id) {
        return assetRepository.findById(id).orElse(null);
    }

    public Asset save(Asset asset) {
        return assetRepository.save(asset);
    }

    public void deleteById(Long id) {
        assetRepository.deleteById(id);
    }

    public List<Asset> search(String keyword) {
        return assetRepository.search(keyword);
    }
} 