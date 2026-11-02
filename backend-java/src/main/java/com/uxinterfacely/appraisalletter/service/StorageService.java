package com.uxinterfacely.appraisalletter.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Stores and reads letter PDFs in a Supabase Storage bucket using Supabase's
 * REST API, so no extra library is needed.
 *
 * Needs (Render environment variables):
 *   SUPABASE_URL          e.g. https://abcdxyz.supabase.co
 *   SUPABASE_SERVICE_KEY  the service_role / secret key. Keep it on the server only.
 *   SUPABASE_BUCKET       optional, defaults to appraisal_letter
 */
@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    @Value("${app.supabase.url:}")
    private String supabaseUrl;

    @Value("${app.supabase.service-key:}")
    private String serviceKey;

    @Value("${app.supabase.bucket:appraisal_letter}")
    private String bucket;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /** Writes one line at startup so Render's Logs show whether the settings arrived (the key itself is never printed). */
    @PostConstruct
    void logConfiguration() {
        log.info("PDF storage: url={} bucket={} serviceKeySet={}",
                clean(supabaseUrl).isEmpty() ? "(missing)" : clean(supabaseUrl),
                clean(bucket),
                !clean(serviceKey).isEmpty());
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    /** Saves the PDF at the given path. An existing file at that path is replaced. */
    public void upload(String path, byte[] bytes) {
        ensureConfigured();
        HttpRequest request = HttpRequest.newBuilder(URI.create(objectUrl(path)))
                .timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + clean(serviceKey))
                .header("apikey", clean(serviceKey))
                .header("Content-Type", "application/pdf")
                .header("x-upsert", "true") // overwrite when the letter is edited and saved again
                .POST(HttpRequest.BodyPublishers.ofByteArray(bytes))
                .build();
        HttpResponse<String> response = send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 300) {
            throw new IllegalStateException(
                    "Could not save the PDF to storage (HTTP " + response.statusCode() + "): " + response.body());
        }
    }

    /** Reads the PDF stored at the given path. */
    public byte[] download(String path) {
        ensureConfigured();
        HttpRequest request = HttpRequest.newBuilder(URI.create(objectUrl(path)))
                .timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + clean(serviceKey))
                .header("apikey", clean(serviceKey))
                .GET()
                .build();
        HttpResponse<byte[]> response = send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() >= 300) {
            throw new IllegalStateException(
                    "Could not read the PDF from storage (HTTP " + response.statusCode() + ").");
        }
        return response.body();
    }

    private String objectUrl(String path) {
        String base = clean(supabaseUrl);
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/storage/v1/object/" + clean(bucket) + "/" + path;
    }

    private void ensureConfigured() {
        java.util.List<String> missing = new java.util.ArrayList<>();
        if (clean(supabaseUrl).isEmpty()) {
            missing.add("SUPABASE_URL");
        }
        if (clean(serviceKey).isEmpty()) {
            missing.add("SUPABASE_SERVICE_KEY");
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "PDF storage is not configured. Missing on the server: " + String.join(" and ", missing) + ".");
        }
        if (!clean(supabaseUrl).startsWith("http://") && !clean(supabaseUrl).startsWith("https://")) {
            throw new IllegalStateException(
                    "SUPABASE_URL must start with https:// (for example https://abcdxyz.supabase.co).");
        }
    }

    private <T> HttpResponse<T> send(HttpRequest request, HttpResponse.BodyHandler<T> handler) {
        try {
            return http.send(request, handler);
        } catch (IOException e) {
            throw new IllegalStateException("Could not reach PDF storage: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("PDF storage request was interrupted.", e);
        }
    }
}