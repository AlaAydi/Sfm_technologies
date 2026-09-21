package com.sfm.connect.coreservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Requête de message envoyé au chatbot")
public class ChatRequest {

    @Schema(description = "Message ou question pour l'assistant", example = "Quel est l'état actuel des anomalies ?")
    private String message;

    public ChatRequest() {}

    public ChatRequest(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}