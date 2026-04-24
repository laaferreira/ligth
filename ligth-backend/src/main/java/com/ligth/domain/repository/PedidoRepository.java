package com.ligth.domain.repository;

import com.ligth.domain.entity.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    @Query("""
        SELECT DISTINCT p FROM Pedido p
        JOIN FETCH p.cliente c
        JOIN FETCH p.itens i
        JOIN FETCH i.produto pr
        WHERE c.id = :clienteId AND pr.id = :produtoId
        ORDER BY p.dataPedido DESC
        """)
    List<Pedido> buscarUltimosPedidosPorClienteEProduto(
            @Param("clienteId") Long clienteId,
            @Param("produtoId") Long produtoId);

    @Query("""
        SELECT DISTINCT p FROM Pedido p
        JOIN FETCH p.cliente c
        JOIN FETCH p.itens i
        JOIN FETCH i.produto pr
        WHERE c.id = :clienteId AND pr.id IN :produtoIds
        ORDER BY p.dataPedido DESC
        """)
    List<Pedido> buscarUltimosPedidosPorClienteEProdutos(
            @Param("clienteId") Long clienteId,
            @Param("produtoIds") List<Long> produtoIds);

    @Query("""
        SELECT COALESCE(SUM(i.quantidade), 0) FROM ItemPedido i
        WHERE i.produto.id = :produtoId AND i.pedido.status = 'EM_ABERTO'
        """)
    Integer somaComprometidoPorProduto(@Param("produtoId") Long produtoId);
}
