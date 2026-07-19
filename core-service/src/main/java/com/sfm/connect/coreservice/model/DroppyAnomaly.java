package com.sfm.connect.coreservice.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "droppy_anomaly", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"mac", "type", "start_at"})
})
public class DroppyAnomaly {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String mac;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private Double score;

    @Column(nullable = false)
    private String severity;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnomalyStatus status = AnomalyStatus.NEW;

    // Constructors
    public DroppyAnomaly() {}

    public DroppyAnomaly(String mac, String type, Double score, String severity, LocalDateTime startAt, LocalDateTime endAt) {
        this.mac = mac;
        this.type = type;
        this.score = score;
        this.severity = severity;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = AnomalyStatus.NEW;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMac() { return mac; }
    public void setMac(String mac) { this.mac = mac; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public LocalDateTime getStartAt() { return startAt; }
    public void setStartAt(LocalDateTime startAt) { this.startAt = startAt; }

    public LocalDateTime getEndAt() { return endAt; }
    public void setEndAt(LocalDateTime endAt) { this.endAt = endAt; }

    public AnomalyStatus getStatus() { return status; }
    public void setStatus(AnomalyStatus status) { this.status = status; }
}
