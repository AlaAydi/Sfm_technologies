package com.sfm.connect.coreservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Réponse retournée par le chatbot Droppy")
public class ChatResponse {

    @Schema(description = "Réponse textuelle de l'assistant IA", example = "Bonjour ! Le système Droppy surveille actuellement les anomalies...")
    private String reply;

    public ChatResponse() {}

    public ChatResponse(String reply) {
        this.reply = reply;
    }

    public String getReply() {
        return reply;
    }

    public void setReply(String reply) {
        this.reply = reply;
    }
}