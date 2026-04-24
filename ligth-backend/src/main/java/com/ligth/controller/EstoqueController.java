package com.ligth.controller;

import com.ligth.domain.entity.MovimentacaoEstoque;
import com.ligth.domain.entity.Produto;
import com.ligth.domain.repository.PedidoRepository;
import com.ligth.domain.repository.ProdutoRepository;
import com.ligth.dto.EstoqueProdutoDTO;
import com.ligth.dto.MovimentacaoDTO;
import com.ligth.dto.MovimentacaoResponseDTO;
import com.ligth.dto.ProdutoDTO;
import com.ligth.service.EstoqueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/estoque")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Estoque", description = "Controle de estoque")
public class EstoqueController {

    private final EstoqueService estoqueService;
    private final ProdutoRepository produtoRepository;
    private final PedidoRepository pedidoRepository;

    @GetMapping("/produto/{produtoId}")
    @Operation(summary = "Estoque atual e futuro de um produto")
    public ResponseEntity<EstoqueProdutoDTO> estoqueProduto(@PathVariable Long produtoId) {
        return produtoRepository.findById(produtoId).map(p -> {
            int comprometido = pedidoRepository.somaComprometidoPorProduto(produtoId);
            return ResponseEntity.ok(new EstoqueProdutoDTO(
                    p.getId(), p.getQuantidadeEstoque(), comprometido,
                    p.getQuantidadeEstoque() - comprometido));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/entrada")
    @Operation(summary = "Entrada de estoque")
    public ResponseEntity<String> entrada(@Valid @RequestBody MovimentacaoDTO dto) {
        estoqueService.entrada(dto.produtoId(), dto.quantidade(), dto.observacao());
        return ResponseEntity.ok("Entrada registrada");
    }

    @PostMapping("/saida")
    @Operation(summary = "Saida de estoque")
    public ResponseEntity<String> saida(@Valid @RequestBody MovimentacaoDTO dto) {
        estoqueService.saida(dto.produtoId(), dto.quantidade(), dto.observacao());
        return ResponseEntity.ok("Saida registrada");
    }

    @GetMapping("/baixo")
    @Operation(summary = "Produtos com estoque baixo")
    public List<ProdutoDTO> estoqueBaixo() {
        return estoqueService.produtosEstoqueBaixo().stream()
                .map(p -> new ProdutoDTO(p.getId(), p.getCodigo(), p.getDescricao(),
                        p.getCategoria(), p.getPrecoCusto(), p.getPrecoTabela(),
                        p.getQuantidadeEstoque(), p.getEstoqueMinimo(), p.getAtivo()))
                .toList();
    }

    @GetMapping("/historico")
    @Operation(summary = "Historico de movimentacoes")
    public List<MovimentacaoResponseDTO> historico(@RequestParam(required = false) Long produtoId) {
        return estoqueService.historico(produtoId).stream().map(m ->
                new MovimentacaoResponseDTO(m.getId(), m.getProduto().getId(),
                        m.getProduto().getDescricao(), m.getTipo().name(),
                        m.getQuantidade(), m.getEstoqueAnterior(), m.getEstoqueAtual(),
                        m.getObservacao(), m.getDataMovimentacao())
        ).toList();
    }
}
