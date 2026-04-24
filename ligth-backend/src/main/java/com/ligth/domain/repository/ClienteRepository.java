package com.ligth.domain.repository;

import com.ligth.domain.entity.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    @Query("SELECT c FROM Cliente c WHERE LOWER(c.nome) LIKE LOWER(CONCAT('%', :termo, '%')) ORDER BY c.nome")
    List<Cliente> buscarPorNome(@Param("termo") String termo);
}
