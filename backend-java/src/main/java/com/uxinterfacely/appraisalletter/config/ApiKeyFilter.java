package com.uxinterfacely.appraisalletter.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/**
 * Requires the x-api-key header on /api/** routes. If SERVER_API_KEY isn't
 * set, requests are allowed through with a warning.
 */
@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    @Value("${app.server-api-key}")
    private String serverApiKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Only guard /api/** routes — let Swagger UI, health checks, etc. through unauthenticated.
        if (!request.getRequestURI().startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Browser preflight requests can't carry the API key; let CORS answer them.
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (serverApiKey == null || serverApiKey.isBlank()) {
            logger.warn("WARNING: SERVER_API_KEY is not set — /api routes are unprotected.");
            filterChain.doFilter(request, response);
            return;
        }

        String providedKey = request.getHeader("x-api-key");
        if (providedKey == null || !providedKey.equals(serverApiKey)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Unauthorized\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}