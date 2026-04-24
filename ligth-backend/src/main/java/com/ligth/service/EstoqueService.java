package com.ligth.service;

import com.ligth.domain.entity.MovimentacaoEstoque;
import com.ligth.domain.entity.MovimentacaoEstoque.TipoMovimentacao;
import com.ligth.domain.entity.Produto;
import com.ligth.domain.repository.MovimentacaoEstoqueRepository;
import com.ligth.domain.repository.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EstoqueService {

    private final ProdutoRepository produtoRepository;
    private final MovimentacaoEstoqueRepository movimentacaoRepository;

    @Transactional
    public void entrada(Long produtoId, int quantidade, String observacao) {
        Produto produto = produtoRepository.findById(produtoId)
                .orElseThrow(() -> new RuntimeException("Produto nao encontrado"));
        int anterior = produto.getQuantidadeEstoque();
        produto.setQuantidadeEstoque(anterior + quantidade);
        produtoRepository.save(produto);
        registrar(produto, TipoMovimentacao.ENTRADA, quantidade, anterior, produto.getQuantidadeEstoque(), observacao);
    }

    @Transactional
    public void saida(Long produtoId, int quantidade, String observacao) {
        Produto produto = produtoRepository.findById(produtoId)
                .orElseThrow(() -> new RuntimeException("Produto nao encontrado"));
        if (produto.getQuantidadeEstoque() < quantidade) {
            throw new RuntimeException("Estoque insuficiente para " + produto.getDescricao()
                    + ". Disponivel: " + produto.getQuantidadeEstoque());
        }
        int anterior = produto.getQuantidadeEstoque();
        produto.setQuantidadeEstoque(anterior - quantidade);
        produtoRepository.save(produto);
        registrar(produto, TipoMovimentacao.SAIDA, quantidade, anterior, produto.getQuantidadeEstoque(), observacao);
    }

    public List<Produto> produtosEstoqueBaixo() {
        return produtoRepository.findAll().stream()
                .filter(p -> p.getAtivo() && p.getQuantidadeEstoque() <= p.getEstoqueMinimo())
                .toList();
    }

    public List<MovimentacaoEstoque> historico(Long produtoId) {
        return produtoId != null
                ? movimentacaoRepository.findByProdutoIdOrderByDataMovimentacaoDesc(produtoId)
                : movimentacaoRepository.findAllByOrderByDataMovimentacaoDesc();
    }

    private void registrar(Produto produto, TipoMovimentacao tipo, int qtd, int anterior, int atual, String obs) {
        movimentacaoRepository.save(MovimentacaoEstoque.builder()
                .produto(produto).tipo(tipo).quantidade(qtd)
                .estoqueAnterior(anterior).estoqueAtual(atual).observacao(obs).build());
    }
}
