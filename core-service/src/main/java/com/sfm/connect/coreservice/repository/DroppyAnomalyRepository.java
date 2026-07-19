package com.sfm.connect.coreservice.repository;

import com.sfm.connect.coreservice.model.AnomalyStatus;
import com.sfm.connect.coreservice.model.DroppyAnomaly;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.Optional;

public interface DroppyAnomalyRepository extends JpaRepository<DroppyAnomaly, Long> {
    
    boolean existsByMacAndTypeAndStartAt(String mac, String type, LocalDateTime startAt);
    
    Optional<DroppyAnomaly> findFirstByMacOrderByStartAtDesc(String mac);
    
    @Query("SELECT a FROM DroppyAnomaly a WHERE " +
           "(:mac IS NULL OR a.mac = :mac) AND " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:severity IS NULL OR a.severity = :severity) AND " +
           "(cast(:start as date) IS NULL OR a.startAt >= :start) AND " +
           "(cast(:end as date) IS NULL OR a.startAt <= :end)")
    Page<DroppyAnomaly> filterAnomalies(
            @Param("mac") String mac,
            @Param("status") AnomalyStatus status,
            @Param("severity") String severity,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable
    );
}
