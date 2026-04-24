package com.ligth.service;

import com.ligth.domain.repository.ClienteRepository;
import com.ligth.domain.repository.ProdutoRepository;
import com.ligth.dto.AutocompleteDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AutocompleteService {

    private final ClienteRepository clienteRepository;
    private final ProdutoRepository produtoRepository;

    @Transactional(readOnly = true)
    public List<AutocompleteDTO> buscarClientes(String termo) {
        return clienteRepository.buscarPorNome(termo).stream()
                .map(c -> new AutocompleteDTO(c.getId(), c.getNome()))
                .limit(10)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AutocompleteDTO> buscarProdutos(String termo) {
        return produtoRepository.buscarPorDescricao(termo).stream()
                .map(p -> new AutocompleteDTO(p.getId(), p.getDescricao()))
                .limit(10)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<com.ligth.dto.ProdutoAutocompleteDTO> buscarProdutosComPreco(String termo) {
        return produtoRepository.buscarPorDescricao(termo).stream()
                .map(p -> new com.ligth.dto.ProdutoAutocompleteDTO(p.getId(), p.getDescricao(), p.getPrecoTabela()))
                .limit(10)
                .toList();
    }
}
