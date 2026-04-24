package com.ligth.controller;

import com.ligth.dto.AutocompleteDTO;
import com.ligth.service.AutocompleteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/autocomplete")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Autocomplete", description = "Endpoints de autocomplete para clientes e produtos")
public class AutocompleteController {

    private final AutocompleteService autocompleteService;

    @GetMapping("/clientes")
    @Operation(summary = "Buscar clientes", description = "Autocomplete de clientes por nome")
    public ResponseEntity<List<AutocompleteDTO>> buscarClientes(@RequestParam String termo) {
        return ResponseEntity.ok(autocompleteService.buscarClientes(termo));
    }

    @GetMapping("/produtos")
    @Operation(summary = "Buscar produtos", description = "Autocomplete de produtos por descricao")
    public ResponseEntity<List<AutocompleteDTO>> buscarProdutos(@RequestParam String termo) {
        return ResponseEntity.ok(autocompleteService.buscarProdutos(termo));
    }

    @GetMapping("/produtos-preco")
    @Operation(summary = "Buscar produtos com preco", description = "Autocomplete de produtos com preco de tabela")
    public ResponseEntity<List<com.ligth.dto.ProdutoAutocompleteDTO>> buscarProdutosComPreco(@RequestParam String termo) {
        return ResponseEntity.ok(autocompleteService.buscarProdutosComPreco(termo));
    }
}
