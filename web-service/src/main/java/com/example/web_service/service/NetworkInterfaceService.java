package com.example.web_service.service;

import com.example.web_service.entity.NetworkInterface;
import com.example.web_service.repository.NetworkInterfaceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class NetworkInterfaceService {
    
    @Autowired
    private NetworkInterfaceRepository networkInterfaceRepository;

    public List<NetworkInterface> findAll() {
        return networkInterfaceRepository.findAll();
    }

    public NetworkInterface findById(Long id) {
        return networkInterfaceRepository.findById(id).orElse(null);
    }

    public NetworkInterface save(NetworkInterface networkInterface) {
        return networkInterfaceRepository.save(networkInterface);
    }

    public void deleteById(Long id) {
        networkInterfaceRepository.deleteById(id);
    }

    public List<NetworkInterface> search(String keyword) {
        return networkInterfaceRepository.search(keyword);
    }
} 