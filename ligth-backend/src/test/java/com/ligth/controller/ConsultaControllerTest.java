package com.ligth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ligth.dto.LoginRequestDTO;
import com.ligth.dto.TokenResponseDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ConsultaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String accessToken;

    @BeforeEach
    void setUp() throws Exception {
        var login = new LoginRequestDTO("admin", "admin123");
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andReturn().getResponse().getContentAsString();

        accessToken = objectMapper.readValue(response, TokenResponseDTO.class).accessToken();
    }

    @Test
    @DisplayName("Deve retornar histórico de pedidos com autenticação")
    void deveRetornarHistoricoComAutenticacao() throws Exception {
        mockMvc.perform(get("/api/consulta/historico")
                        .param("clienteId", "1")
                        .param("produtoIds", "1")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("Deve rejeitar requisição sem autenticação")
    void deveRejeitarSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/consulta/historico")
                        .param("clienteId", "1")
                        .param("produtoIds", "1"))
                .andExpect(status().isForbidden());
    }
}
