package com.uxinterfacely.appraisalletter.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

/**
 * Looks up one employee in the employee master table of ANOTHER Supabase
 * project, through that project's REST API. Only the columns the appraisal
 * form needs are requested (never PAN, UAN, tax or salary-component columns).
 *
 * Needs (Render environment variables):
 *   EMPLOYEE_SUPABASE_URL  the other project's URL, e.g. https://abcdxyz.supabase.co
 *   EMPLOYEE_SUPABASE_KEY  a read-only key for that project (server side only)
 *   EMPLOYEE_TABLE         optional, defaults to employee_master
 */
@Service
public class EmployeeLookupService {

    @Value("${app.employee-source.url:}")
    private String sourceUrl;

    @Value("${app.employee-source.key:}")
    private String sourceKey;

    @Value("${app.employee-source.table:employee_master}")
    private String table;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    public record EmployeeInfo(String employeeId, String fullName, String email,
                               String designation, String department, BigDecimal annualCtc) {}

    /** Returns the newest record for this employee ID, or empty when there is none. */
    public Optional<EmployeeInfo> findByEmployeeId(String employeeId) {
        String id = employeeId == null ? "" : employeeId.trim();
        if (!id.matches("^[A-Za-z0-9-]{2,20}$")) {
            throw new IllegalArgumentException("Enter a valid Employee ID.");
        }
        ensureConfigured();

        String url = cleanUrl(sourceUrl) + "/rest/v1/" + clean(table)
                + "?select=employee_id,full_name,email,designation,department,annual_ctc"
                + "&employee_id=eq." + URLEncoder.encode(id, StandardCharsets.UTF_8)
                + "&order=updated_at.desc.nullslast&limit=1"; // newest record if an employee has several

        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(20))
                .header("apikey", cleanSecret(sourceKey))
                .header("Authorization", "Bearer " + cleanSecret(sourceKey))
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new IllegalStateException("Could not reach the employee database: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("The employee lookup was interrupted.", e);
        }
        if (response.statusCode() >= 300) {
            throw new IllegalStateException("Employee lookup failed (HTTP " + response.statusCode() + ").");
        }

        try {
            JsonNode rows = mapper.readTree(response.body());
            if (rows == null || !rows.isArray() || rows.size() == 0) {
                return Optional.empty();
            }
            JsonNode row = rows.get(0);
            JsonNode ctc = row.path("annual_ctc");
            return Optional.of(new EmployeeInfo(
                    text(row, "employee_id"),
                    text(row, "full_name"),
                    text(row, "email"),
                    text(row, "designation"),
                    text(row, "department"),
                    ctc.isNumber() ? ctc.decimalValue() : null));
        } catch (IOException e) {
            throw new IllegalStateException("The employee database sent an unreadable answer.", e);
        }
    }

    private static String text(JsonNode row, String field) {
        JsonNode node = row.path(field);
        return node.isMissingNode() || node.isNull() ? "" : node.asText("");
    }

    private void ensureConfigured() {
        java.util.List<String> missing = new java.util.ArrayList<>();
        if (cleanUrl(sourceUrl).isEmpty()) {
            missing.add("EMPLOYEE_SUPABASE_URL");
        }
        if (cleanSecret(sourceKey).isEmpty()) {
            missing.add("EMPLOYEE_SUPABASE_KEY");
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "Employee lookup is not configured. Missing on the server: " + String.join(" and ", missing) + ".");
        }
        if (!cleanUrl(sourceUrl).startsWith("http://") && !cleanUrl(sourceUrl).startsWith("https://")) {
            throw new IllegalStateException("EMPLOYEE_SUPABASE_URL must start with https://");
        }
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private static String cleanSecret(String value) {
        return clean(value).replaceAll("^[\"']+|[\"';,\\s]+$", "");
    }

    private static String cleanUrl(String value) {
        return clean(value).replaceAll("^[\"']+|[\\s/;,\"']+$", "");
    }
}