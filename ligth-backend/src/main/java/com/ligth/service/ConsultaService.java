package com.ligth.service;

import com.ligth.domain.entity.ItemPedido;
import com.ligth.domain.entity.Pedido;
import com.ligth.domain.repository.PedidoRepository;
import com.ligth.dto.HistoricoPedidoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConsultaService {

    private final PedidoRepository pedidoRepository;

    @Transactional(readOnly = true)
    public List<HistoricoPedidoDTO> buscarHistorico(Long clienteId, Long produtoId) {
        return buscarHistorico(clienteId, List.of(produtoId));
    }

    @Transactional(readOnly = true)
    public List<HistoricoPedidoDTO> buscarHistorico(Long clienteId, List<Long> produtoIds) {
        List<Pedido> pedidos = pedidoRepository
                .buscarUltimosPedidosPorClienteEProdutos(clienteId, produtoIds);

        Set<Long> produtoIdSet = new HashSet<>(produtoIds);

        // Para cada produto, pegar os 2 últimos pedidos
        Map<Long, List<HistoricoPedidoDTO>> porProduto = new LinkedHashMap<>();

        for (Pedido pedido : pedidos) {
            for (ItemPedido item : pedido.getItens()) {
                Long pid = item.getProduto().getId();
                if (produtoIdSet.contains(pid)) {
                    porProduto.computeIfAbsent(pid, k -> new ArrayList<>());
                    List<HistoricoPedidoDTO> lista = porProduto.get(pid);
                    if (lista.size() < 2) {
                        lista.add(toDTO(pedido, item));
                    }
                }
            }
        }

        return porProduto.values().stream()
                .flatMap(Collection::stream)
                .toList();
    }

    private HistoricoPedidoDTO toDTO(Pedido pedido, ItemPedido item) {
        return new HistoricoPedidoDTO(
                pedido.getNumero(),
                pedido.getDataPedido(),
                item.getProduto().getDescricao(),
                item.getQuantidade(),
                item.getValorUnitario(),
                item.getValorTotal()
        );
    }
}
