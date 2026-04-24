package com.ligth.controller;

import com.ligth.dto.CriarPedidoDTO;
import com.ligth.dto.PedidoDTO;
import com.ligth.service.PedidoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pedidos")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Pedidos", description = "CRUD de pedidos com controle de status e estoque")
public class PedidoController {

    private final PedidoService pedidoService;

    @GetMapping
    @Operation(summary = "Listar pedidos")
    public List<PedidoDTO> listar() { return pedidoService.listar(); }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar pedido por ID")
    public ResponseEntity<PedidoDTO> buscarPorId(@PathVariable Long id) {
        PedidoDTO dto = pedidoService.buscarPorId(id);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    @PostMapping
    @Operation(summary = "Criar pedido (status EM_ABERTO)")
    public ResponseEntity<PedidoDTO> criar(@Valid @RequestBody CriarPedidoDTO dto) {
        PedidoDTO pedido = pedidoService.criar(dto);
        return ResponseEntity.created(URI.create("/api/pedidos/" + pedido.id())).body(pedido);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Editar pedido em aberto")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @Valid @RequestBody CriarPedidoDTO dto) {
        try {
            return ResponseEntity.ok(pedidoService.atualizar(id, dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/confirmar")
    @Operation(summary = "Confirmar pedido (da baixa no estoque)")
    public ResponseEntity<?> confirmar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(pedidoService.confirmar(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/cancelar")
    @Operation(summary = "Cancelar pedido (estorna estoque se confirmado)")
    public ResponseEntity<PedidoDTO> cancelar(@PathVariable Long id) {
        return ResponseEntity.ok(pedidoService.cancelar(id));
    }

    @PatchMapping("/{id}/finalizar")
    @Operation(summary = "Finalizar pedido")
    public ResponseEntity<?> finalizar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(pedidoService.finalizar(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir pedido")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        pedidoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
