package com.rms.restaurant.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * CORS is configured on the Spring Security filter chain
 * (see {@code SecurityConfig#corsConfigurationSource}) so it applies to the
 * secured /api/** endpoints. Keeping a second CORS layer here would emit
 * duplicate Access-Control-Allow-Origin headers, so it is intentionally omitted.
 *
 * <p>Uploaded files are served from the local {@code app.upload.dir} under the
 * public {@code /uploads/**} path.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath.toUri().toString());
    }
}
