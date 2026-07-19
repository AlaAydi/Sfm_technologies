package com.sfm.connect.coreservice.scheduler;

import com.sfm.connect.coreservice.service.DroppyAnomalyService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AnomalyScheduler {

    private static final Logger logger = LoggerFactory.getLogger(AnomalyScheduler.class);

    @Autowired
    private DroppyAnomalyService anomalyService;

    @Value("${droppy.devices:1C:69:20:35:73:C4}")
    private List<String> devices;

    // Runs every 15 minutes (900,000 ms) with an initial delay of 10 seconds
    @Scheduled(fixedDelay = 900000, initialDelay = 10000)
    public void runAnomalyDetectionTask() {
        logger.info("Scheduler triggered anomaly detection for {} devices", devices.size());
        for (String mac : devices) {
            try {
                anomalyService.analyzeDeviceAnomalies(mac);
            } catch (Exception e) {
                logger.error("Failed to run anomaly analysis for MAC=" + mac, e);
            }
        }
    }
}
