package com.ligth.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ItemPedidoDTO(
        Long id,
        @NotNull(message = "Produto e obrigatorio")
        Long produtoId,
        String produtoDescricao,
        String produtoCodigo,
        @NotNull(message = "Quantidade e obrigatoria")
        Integer quantidade,
        @NotNull(message = "Valor unitario e obrigatorio")
        BigDecimal valorUnitario,
        BigDecimal valorTotal
) {}
