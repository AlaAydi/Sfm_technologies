package com.sfm.connect.coreservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Topic prefix for subscriptions (e.g. /topic/droppy/anomalies)
        config.enableSimpleBroker("/topic");
        // Application destination prefix for incoming client messages
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register WebSocket connection endpoint, allowing any origin for local dev
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
        // Raw WebSocket endpoint without SockJS wrapper
        registry.addEndpoint("/ws-raw")
                .setAllowedOriginPatterns("*");
    }
}
