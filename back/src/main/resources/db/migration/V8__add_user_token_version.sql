-- Incremented on credential changes so older JWTs can be rejected centrally.
ALTER TABLE users
    ADD COLUMN token_version INT NOT NULL DEFAULT 0;
