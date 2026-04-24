package com.ligth.controller;

import com.ligth.dto.HistoricoPedidoDTO;
import com.ligth.service.ConsultaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/consulta")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Consulta de Pedidos", description = "Consulta historico de pedidos por cliente e produto")
public class ConsultaController {

    private final ConsultaService consultaService;

    @GetMapping("/historico")
    @Operation(summary = "Buscar historico", description = "Retorna os 2 ultimos pedidos de cada produto para um cliente")
    public ResponseEntity<List<HistoricoPedidoDTO>> buscarHistorico(
            @RequestParam Long clienteId,
            @RequestParam List<Long> produtoIds) {
        List<HistoricoPedidoDTO> resultado = consultaService.buscarHistorico(clienteId, produtoIds);
        return ResponseEntity.ok(resultado);
    }
}
