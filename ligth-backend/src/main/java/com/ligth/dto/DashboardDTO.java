package com.ligth.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardDTO(
        // Resumo geral
        long totalClientes,
        long totalProdutos,
        long totalPedidos,
        long pedidosAbertos,
        BigDecimal faturamentoTotal,
        int produtosEstoqueBaixo,

        // Top 10 produtos mais vendidos (por quantidade)
        List<RankingItem> produtosMaisVendidos,

        // Top 10 clientes que mais compraram (por valor)
        List<RankingItem> clientesMaisCompraram,

        // Faturamento por mes (ultimos 6 meses)
        List<FaturamentoMes> faturamentoPorMes,

        // Produtos com estoque critico
        List<EstoqueItem> estoqueCritico,

        // Pedidos por status
        List<StatusCount> pedidosPorStatus
) {
    public record RankingItem(String label, BigDecimal valor, long quantidade) {}
    public record FaturamentoMes(String mes, BigDecimal faturamento, BigDecimal lucro) {}
    public record EstoqueItem(String codigo, String descricao, int estoque, int minimo) {}
    public record StatusCount(String status, long quantidade) {}
}
