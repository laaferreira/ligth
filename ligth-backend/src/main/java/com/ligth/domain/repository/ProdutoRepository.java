package com.ligth.domain.repository;

import com.ligth.domain.entity.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    @Query("SELECT p FROM Produto p WHERE LOWER(p.descricao) LIKE LOWER(CONCAT('%', :termo, '%')) ORDER BY p.descricao")
    List<Produto> buscarPorDescricao(@Param("termo") String termo);
}
