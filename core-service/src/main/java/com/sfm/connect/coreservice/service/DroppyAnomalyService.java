package com.sfm.connect.coreservice.service;

import com.sfm.connect.coreservice.model.AnomalyStatus;
import com.sfm.connect.coreservice.model.DroppyAnomaly;
import com.sfm.connect.coreservice.repository.DroppyAnomalyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class DroppyAnomalyService {

    private static final Logger logger = LoggerFactory.getLogger(DroppyAnomalyService.class);

    @Autowired
    private DroppyAnomalyRepository repository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Value("${droppy.ai.url:http://localhost:8001}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public void analyzeDeviceAnomalies(String mac) {
        logger.info("Starting anomaly analysis for MAC={}", mac);
        try {
            // Call FastAPI prediction endpoint
            String url = aiServiceUrl + "/predict/" + mac;
            logger.info("Calling AI service at: {}", url);
            
            ResponseEntity<PredictResponse> responseEntity = restTemplate.postForEntity(url, null, PredictResponse.class);
            PredictResponse response = responseEntity.getBody();
            
            if (response != null && response.getAnomalies() != null) {
                List<AnomalyDto> dtos = response.getAnomalies();
                logger.info("Received {} potential anomalies from AI service", dtos.size());
                
                for (AnomalyDto dto : dtos) {
                    LocalDateTime startAt = LocalDateTime.parse(dto.getStart(), DateTimeFormatter.ISO_DATE_TIME);
                    LocalDateTime endAt = LocalDateTime.parse(dto.getEnd(), DateTimeFormatter.ISO_DATE_TIME);
                    
                    // Check for duplicate
                    boolean exists = repository.existsByMacAndTypeAndStartAt(mac, dto.getType(), startAt);
                    if (!exists) {
                        DroppyAnomaly anomaly = new DroppyAnomaly(
                                mac,
                                dto.getType(),
                                dto.getScore(),
                                dto.getSeverity(),
                                startAt,
                                endAt
                        );
                        DroppyAnomaly saved = repository.save(anomaly);
                        logger.info("Saved new anomaly: ID={}, Type={}, Start={}", saved.getId(), saved.getType(), saved.getStartAt());
                        
                        // Broadcast via WebSocket STOMP
                        messagingTemplate.convertAndSend("/topic/droppy/anomalies", saved);
                        logger.info("Broadcasted anomaly ID={} via WebSockets", saved.getId());
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Error analyzing anomalies for MAC=" + mac, e);
        }
    }

    public DroppyAnomaly updateStatus(Long id, AnomalyStatus status) {
        DroppyAnomaly anomaly = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Anomaly not found with ID: " + id));
        anomaly.setStatus(status);
        DroppyAnomaly updated = repository.save(anomaly);
        
        // Broadcast the update so front UI can sync
        messagingTemplate.convertAndSend("/topic/droppy/anomalies/update", updated);
        return updated;
    }

    // Helper classes for REST Deserialization
    public static class PredictResponse {
        private String mac;
        private List<AnomalyDto> anomalies = new ArrayList<>();

        public String getMac() { return mac; }
        public void setMac(String mac) { this.mac = mac; }
        public List<AnomalyDto> getAnomalies() { return anomalies; }
        public void setAnomalies(List<AnomalyDto> anomalies) { this.anomalies = anomalies; }
    }

    public static class AnomalyDto {
        private String type;
        private Double score;
        private String start;
        private String end;
        private String severity;

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public Double getScore() { return score; }
        public void setScore(Double score) { this.score = score; }
        public String getStart() { return start; }
        public void setStart(String start) { this.start = start; }
        public String getEnd() { return end; }
        public void setEnd(String end) { this.end = end; }
        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
    }
}
