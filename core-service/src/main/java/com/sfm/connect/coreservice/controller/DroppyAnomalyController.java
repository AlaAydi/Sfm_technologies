package com.sfm.connect.coreservice.controller;

import com.sfm.connect.coreservice.model.AnomalyStatus;
import com.sfm.connect.coreservice.model.DroppyAnomaly;
import com.sfm.connect.coreservice.repository.DroppyAnomalyRepository;
import com.sfm.connect.coreservice.service.DroppyAnomalyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/droppy/anomalies")
@CrossOrigin(origins = "*") // Allows local development calls from Angular (port 4200)
public class DroppyAnomalyController {

    @Autowired
    private DroppyAnomalyRepository repository;

    @Autowired
    private DroppyAnomalyService service;

    @GetMapping
    public ResponseEntity<Page<DroppyAnomaly>> getAnomalies(
            @RequestParam(required = false) String mac,
            @RequestParam(required = false) AnomalyStatus status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "startAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<DroppyAnomaly> anomalies = repository.filterAnomalies(mac, status, severity, start, end, pageable);
        return ResponseEntity.ok(anomalies);
    }

    @GetMapping("/device/{mac}/latest")
    public ResponseEntity<DroppyAnomaly> getLatestAnomaly(@PathVariable String mac) {
        return repository.findFirstByMacOrderByStartAtDesc(mac)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<DroppyAnomaly> updateStatus(
            @PathVariable Long id,
            @RequestParam AnomalyStatus status
    ) {
        try {
            DroppyAnomaly updated = service.updateStatus(id, status);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/analyze/{mac}")
    public ResponseEntity<Void> triggerAnalysis(@PathVariable String mac) {
        // Run async in a separate thread so it responds quickly (< 3 seconds)
        new Thread(() -> service.analyzeDeviceAnomalies(mac)).start();
        return ResponseEntity.accepted().build();
    }
}
