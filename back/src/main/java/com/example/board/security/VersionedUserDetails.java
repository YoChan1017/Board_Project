package com.example.board.security;

import java.util.Collection;

import org.springframework.security.core.GrantedAuthority;

/** Spring Security principal carrying the persisted JWT token version. */
public class VersionedUserDetails extends org.springframework.security.core.userdetails.User {

    private final int tokenVersion;

    public VersionedUserDetails(
            String username,
            String password,
            Collection<? extends GrantedAuthority> authorities,
            int tokenVersion) {
        super(username, password, authorities);
        this.tokenVersion = tokenVersion;
    }

    public int getTokenVersion() {
        return tokenVersion;
    }
}
