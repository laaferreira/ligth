package com.ligth.config;

import com.ligth.domain.entity.Usuario;
import com.ligth.domain.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(2)
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        usuarioRepository.findByUsername("admin").ifPresent(user -> {
            user.setPassword(passwordEncoder.encode("admin123"));
            usuarioRepository.save(user);
        });
    }
}
