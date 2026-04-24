package com.ligth.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "clientes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(length = 20, unique = true)
    private String cpfCnpj;

    @Column(length = 20)
    private String telefone;

    @Column(length = 200)
    private String email;

    @Column(length = 500)
    private String endereco;

    @Column
    private LocalDate dataCadastro;

    @PrePersist
    void prePersist() {
        if (dataCadastro == null) dataCadastro = LocalDate.now();
    }
}
