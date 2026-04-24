package com.ligth.dto;

public record TokenResponseDTO(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn
) {
    public TokenResponseDTO(String accessToken, String refreshToken, long expiresIn) {
        this(accessToken, refreshToken, "Bearer", expiresIn);
    }
}
