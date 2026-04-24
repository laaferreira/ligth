package com.ligth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProdutoDTO(
        Long id,
        @NotBlank(message = "Codigo e obrigatorio") @Size(max = 100) String codigo,
        @NotBlank(message = "Descricao e obrigatoria") @Size(max = 300) String descricao,
        @Size(max = 100) String categoria,
        BigDecimal precoCusto,
        BigDecimal precoTabela,
        Integer quantidadeEstoque,
        Integer estoqueMinimo,
        Boolean ativo
) {}
