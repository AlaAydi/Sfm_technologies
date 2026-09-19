package com.sfm.connect.coreservice.controller;

import com.sfm.connect.coreservice.dto.ChatRequest;
import com.sfm.connect.coreservice.dto.ChatResponse;
import com.sfm.connect.coreservice.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/droppy/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @PostMapping
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        String reply = chatService.ask(request.getMessage());
        return ResponseEntity.ok(new ChatResponse(reply));
    }
}