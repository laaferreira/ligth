package com.ligth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record ClienteDTO(
        Long id,
        @NotBlank(message = "Nome e obrigatorio")
        @Size(max = 200) String nome,
        @Size(max = 20) String cpfCnpj,
        @Size(max = 20) String telefone,
        @Size(max = 200) String email,
        @Size(max = 500) String endereco,
        LocalDate dataCadastro
) {}
