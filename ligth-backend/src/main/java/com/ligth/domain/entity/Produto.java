package com.ligth.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "produtos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String codigo;

    @Column(nullable = false, length = 300)
    private String descricao;

    @Column(length = 100)
    private String categoria;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal precoCusto = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private Integer quantidadeEstoque = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer estoqueMinimo = 5;

    @Builder.Default
    @Column(nullable = false)
    private Boolean ativo = true;
}
