package com.uxinterfacely.appraisalletter.repository;

import com.uxinterfacely.appraisalletter.model.Appraisal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppraisalRepository extends JpaRepository<Appraisal, Long> {

    List<Appraisal> findAllByOrderByCreatedAtDesc();

    List<Appraisal> findByEmployeeNameContainingIgnoreCaseOrderByCreatedAtDesc(String name);

    /** Matches the text against the employee name OR the employee ID (any part, any case), newest first. */
    List<Appraisal> findByEmployeeNameContainingIgnoreCaseOrEmployeeIdContainingIgnoreCaseOrderByCreatedAtDesc(
            String name, String employeeId);
}
