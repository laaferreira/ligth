package com.ligth.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CriarPedidoDTO(
        @NotNull(message = "Cliente e obrigatorio")
        Long clienteId,
        @NotEmpty(message = "Pedido deve ter pelo menos 1 item")
        @Valid
        List<CriarItemDTO> itens
) {}
