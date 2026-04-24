package com.ligth.dto;

import java.time.LocalDateTime;

public record MovimentacaoResponseDTO(
        Long id,
        Long produtoId,
        String produtoDescricao,
        String tipo,
        Integer quantidade,
        Integer estoqueAnterior,
        Integer estoqueAtual,
        String observacao,
        LocalDateTime dataMovimentacao
) {}
