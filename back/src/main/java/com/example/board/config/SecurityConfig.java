package com.example.board.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.example.board.security.JwtAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            // REST API이므로 CSRF 비활성화
            .csrf(csrf -> csrf.disable())

            // JWT 기반 인증이므로 세션 사용 안 함
            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            // URL별 접근 권한 설정
            .authorizeHttpRequests(auth -> auth

                // 회원가입 / 로그인은 인증 없이 접근 가능
                .requestMatchers(
                    "/api/auth/signup",
                    "/api/auth/login"
                ).permitAll()

                // 게시판 생성은 ADMIN만 가능
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/boards"
                ).hasRole("ADMIN")

                // 그 외 요청은 로그인 필요
                .anyRequest().authenticated()
            )

            // 인증되지 않은 요청은 401
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint(
                    (request, response, authException) -> {
                        response.sendError(
                            HttpStatus.UNAUTHORIZED.value(),
                            "인증이 필요합니다."
                        );
                    }
                )
            )

            // JWT Filter를 UsernamePasswordAuthenticationFilter 앞에 등록
            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}