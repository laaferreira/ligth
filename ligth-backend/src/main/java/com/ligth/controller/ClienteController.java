package com.ligth.controller;

import com.ligth.domain.entity.Cliente;
import com.ligth.domain.repository.ClienteRepository;
import com.ligth.dto.ClienteDTO;
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
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Clientes", description = "CRUD de clientes")
public class ClienteController {

    private final ClienteRepository clienteRepository;

    @GetMapping
    @Operation(summary = "Listar clientes")
    public List<ClienteDTO> listar() {
        return clienteRepository.findAll().stream().map(this::toDTO).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar cliente por ID")
    public ResponseEntity<ClienteDTO> buscarPorId(@PathVariable Long id) {
        return clienteRepository.findById(id).map(c -> ResponseEntity.ok(toDTO(c)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Criar cliente")
    public ResponseEntity<ClienteDTO> criar(@Valid @RequestBody ClienteDTO dto) {
        Cliente c = Cliente.builder().nome(dto.nome()).cpfCnpj(dto.cpfCnpj())
                .telefone(dto.telefone()).email(dto.email()).endereco(dto.endereco()).build();
        c = clienteRepository.save(c);
        return ResponseEntity.created(URI.create("/api/clientes/" + c.getId())).body(toDTO(c));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar cliente")
    public ResponseEntity<ClienteDTO> atualizar(@PathVariable Long id, @Valid @RequestBody ClienteDTO dto) {
        return clienteRepository.findById(id).map(c -> {
            c.setNome(dto.nome()); c.setCpfCnpj(dto.cpfCnpj());
            c.setTelefone(dto.telefone()); c.setEmail(dto.email()); c.setEndereco(dto.endereco());
            return ResponseEntity.ok(toDTO(clienteRepository.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir cliente")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        if (!clienteRepository.existsById(id)) return ResponseEntity.notFound().build();
        clienteRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private ClienteDTO toDTO(Cliente c) {
        return new ClienteDTO(c.getId(), c.getNome(), c.getCpfCnpj(),
                c.getTelefone(), c.getEmail(), c.getEndereco(), c.getDataCadastro());
    }
}
