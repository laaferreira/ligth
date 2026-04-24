package com.ligth.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PedidoDTO(
        Long id,
        String numero,
        LocalDate dataPedido,
        Long clienteId,
        String clienteNome,
        List<ItemPedidoDTO> itens,
        BigDecimal valorTotal,
        String status
) {}
