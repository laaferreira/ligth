package com.ligth.controller;

import com.ligth.dto.LoginRequestDTO;
import com.ligth.dto.RefreshTokenRequestDTO;
import com.ligth.dto.TokenResponseDTO;
import com.ligth.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação", description = "Endpoints de autenticação JWT")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @PostMapping("/login")
    @Operation(summary = "Realizar login", description = "Autentica o usuário e retorna tokens JWT")
    public ResponseEntity<TokenResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        String accessToken = jwtService.generateAccessToken(request.username());
        String refreshToken = jwtService.generateRefreshToken(request.username());

        return ResponseEntity.ok(new TokenResponseDTO(
                accessToken, refreshToken, jwtService.getAccessTokenExpiration()));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovar token", description = "Gera novo access token a partir do refresh token")
    public ResponseEntity<TokenResponseDTO> refresh(@Valid @RequestBody RefreshTokenRequestDTO request) {
        String refreshToken = request.refreshToken();

        if (!jwtService.isTokenValid(refreshToken) || !jwtService.isRefreshToken(refreshToken)) {
            return ResponseEntity.status(401).build();
        }

        String username = jwtService.extractUsername(refreshToken);
        String newAccessToken = jwtService.generateAccessToken(username);
        String newRefreshToken = jwtService.generateRefreshToken(username);

        return ResponseEntity.ok(new TokenResponseDTO(
                newAccessToken, newRefreshToken, jwtService.getAccessTokenExpiration()));
    }
}
