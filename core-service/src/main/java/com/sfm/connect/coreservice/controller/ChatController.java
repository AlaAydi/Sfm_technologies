package com.sfm.connect.coreservice.controller;

import com.sfm.connect.coreservice.dto.ChatRequest;
import com.sfm.connect.coreservice.dto.ChatResponse;
import com.sfm.connect.coreservice.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/droppy/chat")
@CrossOrigin(origins = "*")
@Tag(name = "Chatbot IA", description = "Endpoint de discussion avec l'assistant intelligent Droppy propulsé par Google Gemini")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @PostMapping
    @Operation(summary = "Poser une question à Droppy IA", description = "Envoie un message à l'assistant Droppy et reçoit une réponse contextuelle basée sur l'état du système d'anomalies.")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        String reply = chatService.ask(request.getMessage());
        return ResponseEntity.ok(new ChatResponse(reply));
    }
}