package com.uxinterfacely.appraisalletter.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Equivalent to the Node app's:
 *   app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
 *
 * Reads the same ALLOWED_ORIGIN env var (via app.allowed-origin in
 * application.properties) so this backend's CORS setup matches the
 * exact same configuration conventions as the Offer Letter backend —
 * same env var name, same meaning.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.allowed-origin}")
    private String allowedOrigin;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigin)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
