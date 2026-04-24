# LIGTH - Sistema de Consulta de Pedidos

Sistema para consulta rapida de historico de precos de lampadas vendidas por cliente.

## Arquitetura

```
ligth-backend/   -> Spring Boot 3.2 + H2 + JWT + Swagger
ligth-frontend/  -> Angular 17 + Angular Material (standalone components)
```

## Pre-requisitos

- Java 17+
- Maven 3.8+
- Node.js 18+
- Angular CLI 17 (`npm install -g @angular/cli`)

## Backend

```bash
cd ligth-backend
mvn spring-boot:run
```

- API: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui.html
- H2 Console: http://localhost:8080/h2-console (JDBC URL: `jdbc:h2:mem:ligthdb`)

## Frontend

```bash
cd ligth-frontend
npm install
ng serve
```

- App: http://localhost:4200

## Credenciais

- Usuario: `admin`
- Senha: `admin123`

## Funcionalidades

- Login com JWT + Refresh Token
- Autocomplete de clientes e produtos
- Selecao multipla de produtos
- Consulta dos 2 ultimos pedidos de cada produto para um cliente
- Interface responsiva (desktop + mobile)
- Documentacao Swagger/OpenAPI
