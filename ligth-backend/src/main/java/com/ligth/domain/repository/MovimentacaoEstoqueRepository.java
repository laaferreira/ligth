package com.ligth.domain.repository;

import com.ligth.domain.entity.MovimentacaoEstoque;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MovimentacaoEstoqueRepository extends JpaRepository<MovimentacaoEstoque, Long> {
    List<MovimentacaoEstoque> findByProdutoIdOrderByDataMovimentacaoDesc(Long produtoId);
    List<MovimentacaoEstoque> findAllByOrderByDataMovimentacaoDesc();
}
