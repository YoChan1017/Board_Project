package com.example.board.security;

import java.util.Collection;

import org.springframework.security.core.GrantedAuthority;

/** Spring Security principal carrying the database identity and the current JWT token version. */
public class VersionedUserDetails extends org.springframework.security.core.userdetails.User {

    private final Long userId;
    private final int tokenVersion;

    public VersionedUserDetails(
            Long userId,
            String username,
            String password,
            Collection<? extends GrantedAuthority> authorities,
            int tokenVersion) {
        super(username, password, authorities);
        this.userId = userId;
        this.tokenVersion = tokenVersion;
    }

    public Long getUserId() {
        return userId;
    }

    public int getTokenVersion() {
        return tokenVersion;
    }
}
