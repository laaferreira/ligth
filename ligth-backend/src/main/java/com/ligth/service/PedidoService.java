package com.ligth.service;

import com.ligth.domain.entity.*;
import com.ligth.domain.entity.Pedido.StatusPedido;
import com.ligth.domain.repository.*;
import com.ligth.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final ClienteRepository clienteRepository;
    private final ProdutoRepository produtoRepository;
    private final EstoqueService estoqueService;
    private static final AtomicLong SEQ = new AtomicLong(100);

    @Transactional(readOnly = true)
    public List<PedidoDTO> listar() {
        return pedidoRepository.findAll().stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public PedidoDTO buscarPorId(Long id) {
        return pedidoRepository.findById(id).map(this::toFullDTO).orElse(null);
    }

    @Transactional
    public PedidoDTO criar(CriarPedidoDTO dto) {
        Cliente cliente = clienteRepository.findById(dto.clienteId())
                .orElseThrow(() -> new RuntimeException("Cliente nao encontrado"));
        String numero = "PED-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy"))
                + "-" + String.format("%03d", SEQ.incrementAndGet());
        Pedido pedido = Pedido.builder().numero(numero).dataPedido(LocalDate.now())
                .cliente(cliente).status(StatusPedido.EM_ABERTO).build();
        for (CriarItemDTO itemDto : dto.itens()) {
            Produto produto = produtoRepository.findById(itemDto.produtoId())
                    .orElseThrow(() -> new RuntimeException("Produto nao encontrado: " + itemDto.produtoId()));
            BigDecimal valorTotal = itemDto.valorUnitario().multiply(BigDecimal.valueOf(itemDto.quantidade()));
            pedido.getItens().add(ItemPedido.builder().pedido(pedido).produto(produto)
                    .quantidade(itemDto.quantidade()).valorUnitario(itemDto.valorUnitario())
                    .valorTotal(valorTotal).build());
        }
        return toFullDTO(pedidoRepository.save(pedido));
    }

    @Transactional
    public PedidoDTO atualizar(Long id, CriarPedidoDTO dto) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido nao encontrado"));
        if (pedido.getStatus() != StatusPedido.EM_ABERTO)
            throw new RuntimeException("Somente pedidos em aberto podem ser editados");

        Cliente cliente = clienteRepository.findById(dto.clienteId())
                .orElseThrow(() -> new RuntimeException("Cliente nao encontrado"));
        pedido.setCliente(cliente);
        pedido.getItens().clear();

        for (CriarItemDTO itemDto : dto.itens()) {
            Produto produto = produtoRepository.findById(itemDto.produtoId())
                    .orElseThrow(() -> new RuntimeException("Produto nao encontrado: " + itemDto.produtoId()));
            BigDecimal valorTotal = itemDto.valorUnitario().multiply(BigDecimal.valueOf(itemDto.quantidade()));
            pedido.getItens().add(ItemPedido.builder().pedido(pedido).produto(produto)
                    .quantidade(itemDto.quantidade()).valorUnitario(itemDto.valorUnitario())
                    .valorTotal(valorTotal).build());
        }
        return toFullDTO(pedidoRepository.save(pedido));
    }

    @Transactional
    public PedidoDTO confirmar(Long id) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido nao encontrado"));
        if (pedido.getStatus() != StatusPedido.EM_ABERTO)
            throw new RuntimeException("Pedido nao esta em aberto");
        // Baixa no estoque
        for (ItemPedido item : pedido.getItens()) {
            estoqueService.saida(item.getProduto().getId(), item.getQuantidade(),
                    "Saida por pedido " + pedido.getNumero());
        }
        pedido.setStatus(StatusPedido.CONFIRMADO);
        return toFullDTO(pedidoRepository.save(pedido));
    }

    @Transactional
    public PedidoDTO cancelar(Long id) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido nao encontrado"));
        if (pedido.getStatus() == StatusPedido.CONFIRMADO) {
            // Estornar estoque
            for (ItemPedido item : pedido.getItens()) {
                estoqueService.entrada(item.getProduto().getId(), item.getQuantidade(),
                        null, "Estorno por cancelamento do pedido " + pedido.getNumero());
            }
        }
        pedido.setStatus(StatusPedido.CANCELADO);
        return toFullDTO(pedidoRepository.save(pedido));
    }

    @Transactional
    public PedidoDTO finalizar(Long id) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido nao encontrado"));
        if (pedido.getStatus() != StatusPedido.CONFIRMADO)
            throw new RuntimeException("Pedido precisa estar confirmado para finalizar");
        pedido.setStatus(StatusPedido.FINALIZADO);
        return toFullDTO(pedidoRepository.save(pedido));
    }

    @Transactional
    public void excluir(Long id) { pedidoRepository.deleteById(id); }

    private PedidoDTO toDTO(Pedido p) {
        BigDecimal total = p.getItens().stream().map(ItemPedido::getValorTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new PedidoDTO(p.getId(), p.getNumero(), p.getDataPedido(),
                p.getCliente().getId(), p.getCliente().getNome(), null, total,
                p.getStatus().name());
    }

    private PedidoDTO toFullDTO(Pedido p) {
        List<ItemPedidoDTO> itens = p.getItens().stream().map(i ->
                new ItemPedidoDTO(i.getId(), i.getProduto().getId(),
                        i.getProduto().getDescricao(), i.getProduto().getCodigo(),
                        i.getQuantidade(), i.getValorUnitario(), i.getValorTotal())
        ).toList();
        BigDecimal total = itens.stream().map(ItemPedidoDTO::valorTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new PedidoDTO(p.getId(), p.getNumero(), p.getDataPedido(),
                p.getCliente().getId(), p.getCliente().getNome(), itens, total,
                p.getStatus().name());
    }
}
