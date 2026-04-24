package com.ligth.dto;

public record EstoqueProdutoDTO(
        Long produtoId,
        Integer estoqueAtual,
        Integer comprometido,
        Integer estoqueFuturo
) {}
