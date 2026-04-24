package com.ligth.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "movimentacoes_estoque")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MovimentacaoEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoMovimentacao tipo;

    @Column(nullable = false)
    private Integer quantidade;

    @Column(nullable = false)
    private Integer estoqueAnterior;

    @Column(nullable = false)
    private Integer estoqueAtual;

    @Column(length = 300)
    private String observacao;

    @Column(nullable = false)
    private LocalDateTime dataMovimentacao;

    @PrePersist
    void prePersist() {
        if (dataMovimentacao == null) dataMovimentacao = LocalDateTime.now();
    }

    public enum TipoMovimentacao {
        ENTRADA, SAIDA
    }
}
