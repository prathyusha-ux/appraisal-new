package com.uxinterfacely.appraisalletter.repository;

import com.uxinterfacely.appraisalletter.model.Appraisal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppraisalRepository extends JpaRepository<Appraisal, Long> {

    List<Appraisal> findAllByOrderByCreatedAtDesc();

    List<Appraisal> findByEmployeeNameContainingIgnoreCaseOrderByCreatedAtDesc(String name);
}
