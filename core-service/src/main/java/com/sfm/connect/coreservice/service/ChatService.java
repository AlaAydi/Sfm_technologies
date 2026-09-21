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
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Chat service that bridges the user's question to Google Gemini.
 * The Gemini API key is read ONLY from the .env file (server-side),
 * never from the Angular frontend. All project data passed to the model
 * is gathered from the backend (anomalies DB + FastAPI forecast proxy).
 *
 * Implements a resilient fallback chain over multiple Gemini models
 * (handling 503 SERVICE_UNAVAILABLE, 429 RATE_LIMIT, 404, etc.).
 */
@Service
public class ChatService {

    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);

    private static final String GEMINI_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";
    private static final int MAX_TRANSIENT_RETRIES = 2;
    private static final long RETRY_DELAY_MILLIS = 2000L;

    @Autowired
    private DroppyAnomalyRepository repository;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8000); // 8 secondes de timeout connexion
        factory.setReadTimeout(60000);   // Gemini peut prendre plus de temps avec les modèles de raisonnement
        this.restTemplate = new RestTemplate(factory);
    }

    private String geminiApiKey() {
        String envKey = System.getenv("GEMINI_API_KEY");
        if (envKey != null && !envKey.isBlank()) {
            return envKey.trim();
        }
        for (String dir : List.of(".", "..", "../..")) {
            try {
                Dotenv dotenv = Dotenv.configure().directory(dir).ignoreIfMissing().load();
                String key = dotenv.get("GEMINI_API_KEY");
                if (key != null && !key.isBlank()) {
                    return key.trim();
                }
            } catch (Exception ignored) {}
        }
        return "";
    }

    /**
     * Builds an ordered list of Gemini models to try sequentially.
     * Reads GEMINI_MODELS and GEMINI_MODEL from system env or .env file,
     * and appends default stable models as fallbacks.
     */
    private List<String> geminiCandidateModels() {
        Set<String> models = new LinkedHashSet<>();

        // 1. Lire depuis les variables d'environnement système
        addModels(models, System.getenv("GEMINI_MODELS"));

        // 2. Lire depuis le fichier .env
        for (String dir : List.of(".", "..", "../..")) {
            try {
                Dotenv dotenv = Dotenv.configure().directory(dir).ignoreIfMissing().load();
                addModels(models, dotenv.get("GEMINI_MODELS"));
            } catch (Exception ignored) {}
        }

        // 3. Modèles de secours par défaut (ordonnés pour maximiser la disponibilité)
        List<String> defaultFallbackModels = List.of(
            "gemini-3.6-flash",
            "gemini-3.7-flash",
            "gemini-3.8-flash",
            "gemini-flash-latest"
        );
        models.addAll(defaultFallbackModels);

        return new ArrayList<>(models);
    }

    private void addModels(Set<String> set, String rawValue) {
        if (rawValue != null && !rawValue.isBlank()) {
            for (String part : rawValue.split(",")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    set.add(trimmed);
                }
            }
        }
    }

    public String ask(String userMessage) {
        String apiKey = geminiApiKey();
        if (apiKey.isEmpty()) {
            return "⚠️ La clé API Gemini n'est pas configurée. Ajoutez GEMINI_API_KEY dans le fichier .env à la racine du projet, puis redémarrez le backend.";
        }

        String context = buildSystemContext();
        String fullPrompt = context + "\n\nQuestion de l'utilisateur :\n" + userMessage;

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

        List<String> candidateModels = geminiCandidateModels();
        String lastErrorMessage = "Aucune réponse obtenue.";

        for (String model : candidateModels) {
            String url = String.format(GEMINI_API_URL, model, apiKey);
            for (int attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt++) {
                try {
                    logger.info("Tentative d'appel à Gemini avec le modèle : [{}] (essai {})", model, attempt + 1);
                    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
                    ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && candidates.size() > 0) {
                        JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                        if (!textNode.isMissingNode() && !textNode.asText().isBlank()) {
                            logger.info("Réponse obtenue avec succès via le modèle : [{}]", model);
                            return textNode.asText();
                        }
                    }

                    JsonNode errorMsg = root.path("error").path("message");
                    if (!errorMsg.isMissingNode()) {
                        lastErrorMessage = "Modèle " + model + " : " + errorMsg.asText();
                        logger.warn("Modèle [{}] a renvoyé une erreur : {}. Tentative avec le modèle de secours suivant...",
                                model, errorMsg.asText());
                    }
                    break;
                } catch (HttpStatusCodeException e) {
                    lastErrorMessage = "Erreur HTTP " + e.getStatusCode() + " sur " + model;
                        int statusCode = e.getStatusCode().value();
                        if ((statusCode == 429 || statusCode == 503) && attempt < MAX_TRANSIENT_RETRIES) {
                        logger.warn("Modèle [{}] temporairement indisponible (HTTP {}), nouvel essai dans {} ms",
                            model, statusCode, RETRY_DELAY_MILLIS);
                        waitBeforeRetry();
                        continue;
                    }
                    logger.warn("Modèle [{}] indisponible ou en erreur (HTTP {}). Passage au modèle de secours...",
                            model, e.getStatusCode());
                    break;
                } catch (RestClientException e) {
                    logger.warn("Échec réseau sur le modèle [{}] : {}. Passage au modèle de secours...",
                            model, e.getMessage());
                    lastErrorMessage = "Erreur réseau sur " + model;
                    if (attempt < MAX_TRANSIENT_RETRIES) {
                        waitBeforeRetry();
                        continue;
                    }
                    break;
                } catch (Exception e) {
                    logger.warn("Erreur inattendue sur le modèle [{}] : {}. Passage au modèle de secours...",
                            model, e.getMessage());
                    lastErrorMessage = "Erreur sur " + model;
                    break;
                }
            }
        }

        logger.error("Tous les modèles Gemini ont échoué. Dernier message : {}", lastErrorMessage);
        return "⚠️ Le service IA est temporairement indisponible. Réessayez dans quelques instants.\n" +
                "Si le problème persiste, vérifiez la configuration de GEMINI_MODELS dans le fichier .env.";
    }

    private void waitBeforeRetry() {
        try {
            Thread.sleep(RETRY_DELAY_MILLIS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
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