package com.uxinterfacely.appraisalletter.controller;

import com.uxinterfacely.appraisalletter.service.EmployeeLookupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** GET /api/employees/{employeeId}: details from the employee master, used to fill the form. */
@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeLookupService lookupService;

    public EmployeeController(EmployeeLookupService lookupService) {
        this.lookupService = lookupService;
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<?> getEmployee(@PathVariable String employeeId) {
        return lookupService.findByEmployeeId(employeeId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404)
                        .body(Map.of("message", "No employee found for ID " + employeeId + ".")));
    }
}