package com.ligth.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record HistoricoPedidoDTO(
        String numeroPedido,
        LocalDate dataPedido,
        String descricaoProduto,
        Integer quantidade,
        BigDecimal valorUnitario,
        BigDecimal valorTotal
) {
}
