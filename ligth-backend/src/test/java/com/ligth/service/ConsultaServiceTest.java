package com.ligth.service;

import com.ligth.domain.entity.*;
import com.ligth.domain.repository.PedidoRepository;
import com.ligth.dto.HistoricoPedidoDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConsultaServiceTest {

    @Mock
    private PedidoRepository pedidoRepository;

    @InjectMocks
    private ConsultaService consultaService;

    @Test
    @DisplayName("Deve retornar no máximo 2 registros de histórico")
    void deveRetornarMaximoDoisRegistros() {
        Long clienteId = 1L;
        Long produtoId = 1L;

        Produto produto = Produto.builder().id(produtoId).descricao("LED Bulbo 9W").build();
        Cliente cliente = Cliente.builder().id(clienteId).nome("Cliente Teste").build();

        Pedido pedido1 = Pedido.builder()
                .id(1L).numero("PED-001").dataPedido(LocalDate.of(2025, 3, 20)).cliente(cliente)
                .itens(List.of(ItemPedido.builder()
                        .produto(produto).quantidade(100)
                        .valorUnitario(new BigDecimal("7.50")).valorTotal(new BigDecimal("750.00")).build()))
                .build();

        Pedido pedido2 = Pedido.builder()
                .id(2L).numero("PED-002").dataPedido(LocalDate.of(2025, 2, 10)).cliente(cliente)
                .itens(List.of(ItemPedido.builder()
                        .produto(produto).quantidade(150)
                        .valorUnitario(new BigDecimal("7.30")).valorTotal(new BigDecimal("1095.00")).build()))
                .build();

        Pedido pedido3 = Pedido.builder()
                .id(3L).numero("PED-003").dataPedido(LocalDate.of(2025, 1, 15)).cliente(cliente)
                .itens(List.of(ItemPedido.builder()
                        .produto(produto).quantidade(200)
                        .valorUnitario(new BigDecimal("7.10")).valorTotal(new BigDecimal("1420.00")).build()))
                .build();

        when(pedidoRepository.buscarUltimosPedidosPorClienteEProduto(clienteId, produtoId))
                .thenReturn(List.of(pedido1, pedido2, pedido3));

        List<HistoricoPedidoDTO> resultado = consultaService.buscarHistorico(clienteId, produtoId);

        assertThat(resultado).hasSize(2);
        assertThat(resultado.get(0).numeroPedido()).isEqualTo("PED-001");
        assertThat(resultado.get(1).numeroPedido()).isEqualTo("PED-002");
    }

    @Test
    @DisplayName("Deve retornar lista vazia quando não há pedidos")
    void deveRetornarListaVaziaQuandoNaoHaPedidos() {
        when(pedidoRepository.buscarUltimosPedidosPorClienteEProduto(99L, 99L))
                .thenReturn(List.of());

        List<HistoricoPedidoDTO> resultado = consultaService.buscarHistorico(99L, 99L);

        assertThat(resultado).isEmpty();
    }
}
