
package com.example.board.security;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(
            JwtTokenProvider jwtTokenProvider,
            CustomUserDetailsService userDetailsService) {

        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        /*
        // ===== JWT 필터 시작 디버그 =====
        System.out.println();
        System.out.println("===== JWT FILTER START =====");
        System.out.println("Method: " + request.getMethod());
        System.out.println("URI: " + request.getRequestURI());
        */

        String authorizationHeader =
                request.getHeader("Authorization");

        /*
        System.out.println(
                "Authorization 존재: "
                + (authorizationHeader != null)
        );
        */

        if (authorizationHeader == null
                || !authorizationHeader.startsWith("Bearer ")) {

            /*
            System.out.println("→ JWT 없음");
            */

            filterChain.doFilter(request, response);
            return;
        }

        String token = authorizationHeader.substring(7);

        try {
            String username =
                    jwtTokenProvider.getUsername(token);

            /*
            System.out.println(
                    "→ JWT username: " + username
            );
            */

            if (SecurityContextHolder.getContext()
                    .getAuthentication() == null) {

                UserDetails userDetails =
                        userDetailsService.loadUserByUsername(username);

                /*
                System.out.println(
                        "→ DB 사용자 조회 완료: "
                        + userDetails.getUsername()
                );

                System.out.println(
                        "→ 권한: "
                        + userDetails.getAuthorities()
                );
                */

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                SecurityContextHolder.getContext()
                        .setAuthentication(authentication);

                /*
                System.out.println(
                        "→ SecurityContext 인증 등록 완료"
                );

                System.out.println(
                        "→ 현재 인증 객체: "
                        + SecurityContextHolder.getContext()
                                .getAuthentication()
                );
                */
            }

        } catch (Exception e) {

            SecurityContextHolder.clearContext();

            /*
            System.out.println();
            System.out.println("===== JWT 인증 실패 =====");
            System.out.println(
                    "예외: " + e.getClass().getName()
            );
            System.out.println(
                    "메시지: " + e.getMessage()
            );
            */
        }

        /*
        System.out.println("===== JWT FILTER END =====");
        System.out.println();
        */

        filterChain.doFilter(request, response);
    }
}