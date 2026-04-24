package com.ligth.service;

import com.ligth.domain.entity.*;
import com.ligth.domain.entity.Pedido.StatusPedido;
import com.ligth.domain.repository.*;
import com.ligth.dto.DashboardDTO;
import com.ligth.dto.DashboardDTO.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ClienteRepository clienteRepository;
    private final ProdutoRepository produtoRepository;
    private final PedidoRepository pedidoRepository;

    @Transactional(readOnly = true)
    public DashboardDTO getDashboard() {
        List<Pedido> todosPedidos = pedidoRepository.findAll();
        List<Produto> todosProdutos = produtoRepository.findAll();

        // Pedidos confirmados ou finalizados (com faturamento)
        List<Pedido> pedidosFaturados = todosPedidos.stream()
                .filter(p -> p.getStatus() == StatusPedido.CONFIRMADO || p.getStatus() == StatusPedido.FINALIZADO)
                .toList();

        // Resumo
        long totalClientes = clienteRepository.count();
        long totalProdutos = produtoRepository.count();
        long totalPedidos = todosPedidos.size();
        long pedidosAbertos = todosPedidos.stream().filter(p -> p.getStatus() == StatusPedido.EM_ABERTO).count();

        BigDecimal faturamentoTotal = pedidosFaturados.stream()
                .flatMap(p -> p.getItens().stream())
                .map(ItemPedido::getValorTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int produtosEstoqueBaixo = (int) todosProdutos.stream()
                .filter(p -> p.getAtivo() && p.getQuantidadeEstoque() <= p.getEstoqueMinimo())
                .count();

        // Top 10 produtos mais vendidos
        Map<Long, Object[]> produtoVendas = new HashMap<>();
        for (Pedido ped : pedidosFaturados) {
            for (ItemPedido item : ped.getItens()) {
                Long pid = item.getProduto().getId();
                Object[] acc = produtoVendas.computeIfAbsent(pid,
                        k -> new Object[]{item.getProduto().getDescricao(), BigDecimal.ZERO, 0L});
                acc[1] = ((BigDecimal) acc[1]).add(item.getValorTotal());
                acc[2] = (long) acc[2] + item.getQuantidade();
            }
        }

        List<RankingItem> produtosMaisVendidos = produtoVendas.values().stream()
                .sorted((a, b) -> Long.compare((long) b[2], (long) a[2]))
                .limit(10)
                .map(a -> new RankingItem((String) a[0], (BigDecimal) a[1], (long) a[2]))
                .toList();

        // Top 10 clientes
        Map<Long, Object[]> clienteCompras = new HashMap<>();
        for (Pedido ped : pedidosFaturados) {
            Long cid = ped.getCliente().getId();
            BigDecimal totalPed = ped.getItens().stream().map(ItemPedido::getValorTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            Object[] acc = clienteCompras.computeIfAbsent(cid,
                    k -> new Object[]{ped.getCliente().getNome(), BigDecimal.ZERO, 0L});
            acc[1] = ((BigDecimal) acc[1]).add(totalPed);
            acc[2] = (long) acc[2] + 1;
        }
        List<RankingItem> clientesMaisCompraram = clienteCompras.values().stream()
                .sorted((a, b) -> ((BigDecimal) b[1]).compareTo((BigDecimal) a[1]))
                .limit(10)
                .map(a -> new RankingItem((String) a[0], (BigDecimal) a[1], (long) a[2]))
                .toList();

        // Faturamento por mes (ultimos 6 meses)
        LocalDate hoje = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM");
        List<FaturamentoMes> faturamentoPorMes = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate mesRef = hoje.minusMonths(i).withDayOfMonth(1);
            String mesKey = mesRef.format(fmt);
            BigDecimal fat = BigDecimal.ZERO;
            BigDecimal custo = BigDecimal.ZERO;
            for (Pedido ped : pedidosFaturados) {
                if (ped.getDataPedido().format(fmt).equals(mesKey)) {
                    for (ItemPedido item : ped.getItens()) {
                        fat = fat.add(item.getValorTotal());
                        BigDecimal pc = item.getProduto().getPrecoCusto();
                        if (pc != null) {
                            custo = custo.add(pc.multiply(BigDecimal.valueOf(item.getQuantidade())));
                        }
                    }
                }
            }
            faturamentoPorMes.add(new FaturamentoMes(mesKey, fat, fat.subtract(custo)));
        }

        // Estoque critico
        List<EstoqueItem> estoqueCritico = todosProdutos.stream()
                .filter(p -> p.getAtivo() && p.getQuantidadeEstoque() <= p.getEstoqueMinimo())
                .sorted(Comparator.comparingInt(Produto::getQuantidadeEstoque))
                .limit(10)
                .map(p -> new EstoqueItem(p.getCodigo(), p.getDescricao(), p.getQuantidadeEstoque(), p.getEstoqueMinimo()))
                .toList();

        // Pedidos por status
        List<StatusCount> pedidosPorStatus = todosPedidos.stream()
                .collect(Collectors.groupingBy(p -> p.getStatus().name(), Collectors.counting()))
                .entrySet().stream()
                .map(e -> new StatusCount(e.getKey(), e.getValue()))
                .toList();

        return new DashboardDTO(totalClientes, totalProdutos, totalPedidos, pedidosAbertos,
                faturamentoTotal, produtosEstoqueBaixo, produtosMaisVendidos, clientesMaisCompraram,
                faturamentoPorMes, estoqueCritico, pedidosPorStatus);
    }
}
