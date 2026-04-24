package com.ligth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record MovimentacaoDTO(
        @NotNull Long produtoId,
        @NotNull @Positive Integer quantidade,
        BigDecimal precoCompra,
        String observacao
) {}
