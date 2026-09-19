package com.sfm.connect.coreservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sfm.connect.coreservice.model.AnomalyStatus;
import com.sfm.connect.coreservice.model.DroppyAnomaly;
import com.sfm.connect.coreservice.repository.DroppyAnomalyRepository;
import io.github.cdimascio.dotenv.Dotenv;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Chat service that bridges the user's question to Google Gemini.
 * The Gemini API key is read ONLY from the .env file (server-side),
 * never from the Angular frontend. All project data passed to the model
 * is gathered from the backend (anomalies DB + FastAPI forecast proxy).
 */
@Service
public class ChatService {

    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);

    private static final String GEMINI_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    @Autowired
    private DroppyAnomalyRepository repository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String geminiApiKey() {
        // .env is located at the project root (where run_app.bat lives).
        Dotenv dotenv = Dotenv.configure().directory("../").ignoreIfMissing().load();
        String key = dotenv.get("GEMINI_API_KEY");
        return key == null ? "" : key.trim();
    }

    private String geminiModel() {
        Dotenv dotenv = Dotenv.configure().directory("../").ignoreIfMissing().load();
        String model = dotenv.get("GEMINI_MODEL");
        return (model == null || model.isBlank()) ? "gemini-2.0-flash" : model.trim();
    }

    public String ask(String userMessage) {
        String apiKey = geminiApiKey();
        if (apiKey.isEmpty()) {
            return "⚠️ La clé API Gemini n'est pas configurée. Ajoutez GEMINI_API_KEY dans le fichier .env à la racine du projet, puis redémarrez le backend.";
        }

        String context = buildSystemContext();
        String fullPrompt = context + "\n\nQuestion de l'utilisateur :\n" + userMessage;

        String model = geminiModel();
        String url = String.format(GEMINI_API_URL, model, apiKey);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("role", "user", "parts", List.of(Map.of("text", fullPrompt)))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 1200
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode text = candidates.get(0).path("content").path("parts").get(0).path("text");
                return text.asText("Je n'ai pas pu générer de réponse.");
            }
            JsonNode errorMsg = root.path("error").path("message");
            return "Erreur de l'API Gemini : " + errorMsg.asText("réponse inconnue");
        } catch (RestClientException e) {
            logger.error("Gemini API call failed", e);
            return "Impossible de contacter l'API Gemini. Vérifiez votre connexion internet et la clé GEMINI_API_KEY.";
        } catch (Exception e) {
            logger.error("Gemini parsing failed", e);
            return "Une erreur est survenue lors du traitement de la réponse Gemini.";
        }
    }

    /**
     * Builds a concise, up-to-date summary of the data available in the
     * backend so Gemini can answer project-specific questions.
     */
    private String buildSystemContext() {
        StringBuilder sb = new StringBuilder();

        sb.append("Tu es l'assistant AI de Droppy, une plateforme de détection intelligente de fuites d'eau. ");
        sb.append("Réponds en français, de manière claire et professionnelle. ");
        sb.append("Utilise uniquement le contexte suivant pour répondre aux questions sur les anomalies et les prévisions. ");
        sb.append("Si tu ne connais pas la réponse, dis-le honnêtement.\n\n");

        try {
            long total = repository.count();
            long newCount = repository.countByStatus(AnomalyStatus.NEW);
            long confirmed = repository.countByStatus(AnomalyStatus.CONFIRMED);
            long falsePos = repository.countByStatus(AnomalyStatus.FALSE_POSITIVE);
            long high = repository.countBySeverity("HIGH");
            long medium = repository.countBySeverity("MEDIUM");

            sb.append("État du système (données réelles du backend Droppy) :\n");
            sb.append("- Anomalies totales en base : ").append(total).append("\n");
            sb.append("- En attente (NEW) : ").append(newCount).append("\n");
            sb.append("- Confirmées : ").append(confirmed).append("\n");
            sb.append("- Faux positifs : ").append(falsePos).append("\n");
            sb.append("- Sévérité haute : ").append(high).append("\n");
            sb.append("- Sévérité moyenne : ").append(medium).append("\n");

            List<DroppyAnomaly> latest = repository.findTop10ByOrderByStartAtDesc();
            sb.append("\nDernières anomalies enregistrées :\n");
            if (latest.isEmpty()) {
                sb.append("Aucune anomalie détectée pour le moment.\n");
            } else {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                for (int i = 0; i < latest.size(); i++) {
                    DroppyAnomaly a = latest.get(i);
                    sb.append(i + 1).append(". [").append(a.getType()).append("] MAC=").append(a.getMac())
                            .append(" sévérité=").append(a.getSeverity())
                            .append(" statut=").append(a.getStatus())
                            .append(" score=").append(String.format("%.2f", a.getScore()))
                            .append(" début=").append(a.getStartAt() == null ? "?" : a.getStartAt().format(fmt))
                            .append("\n");
                }
            }
        } catch (Exception e) {
            logger.warn("Failed to build anomaly context for chat", e);
            sb.append("\n(Statistiques des anomalies temporairement indisponibles)\n");
        }

        return sb.toString();
    }
}