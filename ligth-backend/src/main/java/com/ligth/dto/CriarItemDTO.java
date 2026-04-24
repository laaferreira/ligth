package com.ligth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record CriarItemDTO(
        @NotNull Long produtoId,
        @NotNull @Positive Integer quantidade,
        @NotNull @Positive BigDecimal valorUnitario
) {}
