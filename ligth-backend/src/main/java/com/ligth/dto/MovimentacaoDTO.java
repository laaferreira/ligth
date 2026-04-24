package com.ligth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record MovimentacaoDTO(
        @NotNull Long produtoId,
        @NotNull @Positive Integer quantidade,
        String observacao
) {}
