package com.ligth.controller;

import com.ligth.domain.entity.Produto;
import com.ligth.domain.repository.ProdutoRepository;
import com.ligth.dto.ProdutoDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/produtos")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Produtos", description = "CRUD de produtos")
public class ProdutoController {

    private final ProdutoRepository produtoRepository;

    @GetMapping
    @Operation(summary = "Listar produtos")
    public List<ProdutoDTO> listar() {
        return produtoRepository.findAll().stream().map(this::toDTO).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar produto por ID")
    public ResponseEntity<ProdutoDTO> buscarPorId(@PathVariable Long id) {
        return produtoRepository.findById(id).map(p -> ResponseEntity.ok(toDTO(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Criar produto")
    public ResponseEntity<ProdutoDTO> criar(@Valid @RequestBody ProdutoDTO dto) {
        Produto p = Produto.builder().codigo(dto.codigo()).descricao(dto.descricao())
                .categoria(dto.categoria()).precoCusto(dto.precoCusto()).precoTabela(dto.precoTabela())
                .quantidadeEstoque(dto.quantidadeEstoque() != null ? dto.quantidadeEstoque() : 0)
                .estoqueMinimo(dto.estoqueMinimo() != null ? dto.estoqueMinimo() : 5)
                .ativo(dto.ativo() != null ? dto.ativo() : true).build();
        p = produtoRepository.save(p);
        return ResponseEntity.created(URI.create("/api/produtos/" + p.getId())).body(toDTO(p));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar produto")
    public ResponseEntity<ProdutoDTO> atualizar(@PathVariable Long id, @Valid @RequestBody ProdutoDTO dto) {
        return produtoRepository.findById(id).map(p -> {
            p.setCodigo(dto.codigo()); p.setDescricao(dto.descricao());
            p.setCategoria(dto.categoria()); p.setPrecoCusto(dto.precoCusto());
            p.setPrecoTabela(dto.precoTabela());
            if (dto.estoqueMinimo() != null) p.setEstoqueMinimo(dto.estoqueMinimo());
            if (dto.ativo() != null) p.setAtivo(dto.ativo());
            return ResponseEntity.ok(toDTO(produtoRepository.save(p)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir produto")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        if (!produtoRepository.existsById(id)) return ResponseEntity.notFound().build();
        produtoRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private ProdutoDTO toDTO(Produto p) {
        return new ProdutoDTO(p.getId(), p.getCodigo(), p.getDescricao(), p.getCategoria(),
                p.getPrecoCusto(), p.getPrecoTabela(), p.getQuantidadeEstoque(),
                p.getEstoqueMinimo(), p.getAtivo());
    }
}
