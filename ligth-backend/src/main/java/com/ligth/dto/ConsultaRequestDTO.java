package com.ligth.dto;

import jakarta.validation.constraints.NotNull;

public record ConsultaRequestDTO(
        @NotNull(message = "ID do cliente é obrigatório")
        Long clienteId,
        @NotNull(message = "ID do produto é obrigatório")
        Long produtoId
) {
}
