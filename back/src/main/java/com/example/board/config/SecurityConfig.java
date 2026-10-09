
package com.example.board.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.example.board.exception.ErrorResponse;
import com.example.board.security.JwtAuthenticationFilter;

import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JsonMapper jsonMapper;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            JsonMapper jsonMapper) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.jsonMapper = jsonMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/signup",
                    "/api/auth/login",
                    "/error"
                ).permitAll()

                .requestMatchers(
                    HttpMethod.POST,
                    "/api/boards"
                ).hasRole("ADMIN")

                .requestMatchers(
                    HttpMethod.PUT,
                    "/api/boards/**"
                ).hasRole("ADMIN")

                .requestMatchers(
                    HttpMethod.DELETE,
                    "/api/boards/**"
                ).hasRole("ADMIN")

                .requestMatchers(
                    HttpMethod.POST,
                    "/api/boards/*/categories"
                ).hasRole("ADMIN")

                .requestMatchers(
                    HttpMethod.PUT,
                    "/api/categories/**"
                ).hasRole("ADMIN")

                .requestMatchers(
                    HttpMethod.DELETE,
                    "/api/categories/**"
                ).hasRole("ADMIN")

                .anyRequest().authenticated()
            )

            .exceptionHandling(exception -> exception

                // Return a consistent JSON response for HTTP 401.
                .authenticationEntryPoint(
                    (request, response, authException) ->
                        writeErrorResponse(
                            response,
                            HttpStatus.UNAUTHORIZED,
                            "UNAUTHORIZED",
                            "인증이 필요합니다."
                        )
                )

                // Return a consistent JSON response for HTTP 403.
                .accessDeniedHandler(
                    (request, response, accessDeniedException) ->
                        writeErrorResponse(
                            response,
                            HttpStatus.FORBIDDEN,
                            "FORBIDDEN",
                            "접근 권한이 없습니다."
                        )
                )
            )

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    // Write security errors using the shared ErrorResponse format.
    private void writeErrorResponse(
            HttpServletResponse response,
            HttpStatus status,
            String code,
            String message) throws IOException {

        response.setStatus(status.value());
        response.setCharacterEncoding(
                StandardCharsets.UTF_8.name());
        response.setContentType(
                MediaType.APPLICATION_JSON_VALUE);

        ErrorResponse errorResponse =
                new ErrorResponse(code, message);

        jsonMapper.writeValue(
                response.getOutputStream(),
                errorResponse
        );
    }

    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter>
            jwtFilterRegistration(
                    JwtAuthenticationFilter filter) {

        FilterRegistrationBean<JwtAuthenticationFilter> registration =
                new FilterRegistrationBean<>(filter);

        registration.setEnabled(false);

        return registration;
    }
}