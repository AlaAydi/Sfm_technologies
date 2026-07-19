package com.sfm.connect.coreservice.controller;

import com.sfm.connect.coreservice.service.DroppyAnomalyService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.core.ParameterizedTypeReference;
import java.util.List;
import java.util.Map;

/**
 * Proxy controller that forwards forecast requests to the FastAPI Python microservice.
 * Spring Boot acts as a single gateway for the Angular frontend.
 */
@RestController
@RequestMapping("/api/v1/droppy/anomalies")
@CrossOrigin(origins = "*")
public class ForecastProxyController {

    @Value("${droppy.ai.url:http://localhost:8001}")
    private String aiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/forecast/{mac}")
    public ResponseEntity<List<Map<String, Object>>> getForecast(
            @PathVariable String mac,
            @RequestParam(defaultValue = "7") int days) {

        String url = aiUrl + "/forecast/" + mac + "?days=" + days;
        List<Map<String, Object>> result = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}
        ).getBody();

        return ResponseEntity.ok(result);
    }
}
