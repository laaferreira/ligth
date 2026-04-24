-- Usuario padrao (senha sera atualizada pelo DataSeeder com BCrypt)
INSERT INTO usuarios (username, password, nome_completo) VALUES
('admin', 'PLACEHOLDER', 'Administrador LIGHT');

-- Clientes (8)
INSERT INTO clientes (nome, cpf_cnpj, telefone, email, endereco, data_cadastro) VALUES
('Eletro Casa Materiais', '12.345.678/0001-90', '(11) 3456-7890', 'compras@eletrocasa.com.br', 'Rua das Lampadas 100 - SP', '2024-01-10'),
('Iluminar Comercio LTDA', '23.456.789/0001-01', '(11) 2345-6789', 'pedidos@iluminar.com.br', 'Av Brasil 500 - SP', '2024-02-15'),
('Casa das Lampadas', '34.567.890/0001-12', '(21) 3456-7890', 'contato@casadaslampadas.com.br', 'Rua da Luz 200 - RJ', '2024-03-20'),
('Luz & Cia Distribuidora', '45.678.901/0001-23', '(31) 4567-8901', 'vendas@luzecia.com.br', 'Av Amazonas 1000 - MG', '2024-04-05'),
('MegaLight Importadora', '56.789.012/0001-34', '(41) 5678-9012', 'compras@megalight.com.br', 'Rua XV de Novembro 300 - PR', '2024-05-10'),
('Brilho Total Eletrica', '67.890.123/0001-45', '(51) 6789-0123', 'pedidos@brilhototal.com.br', 'Av Ipiranga 800 - RS', '2024-06-15'),
('Nova Luz Materiais', '78.901.234/0001-56', '(61) 7890-1234', 'contato@novaluz.com.br', 'SQN 310 Bloco A - DF', '2024-07-20'),
('Ponto da Luz Eletrica', '89.012.345/0001-67', '(71) 8901-2345', 'vendas@pontodaluz.com.br', 'Av Sete de Setembro 400 - BA', '2024-08-25');

-- Produtos (15) com estoque
INSERT INTO produtos (codigo, descricao, categoria, preco_custo, preco_tabela, quantidade_estoque, estoque_minimo, ativo) VALUES
('LED-BUL-9W', 'Lampada LED Bulbo 9W Branco Frio', 'LED', 4.50, 8.90, 500, 50, true),
('LED-BUL-12W', 'Lampada LED Bulbo 12W Branco Frio', 'LED', 6.30, 12.50, 300, 30, true),
('LED-BUL-15W', 'Lampada LED Bulbo 15W Branco Quente', 'LED', 8.00, 15.90, 200, 20, true),
('LED-TUB-18W', 'Lampada LED Tubular T8 18W 120cm', 'LED Tubular', 11.00, 22.00, 150, 15, true),
('LED-TUB-9W', 'Lampada LED Tubular T8 9W 60cm', 'LED Tubular', 7.30, 14.50, 180, 20, true),
('LED-DIC-5W', 'Lampada LED Dicroica GU10 5W', 'LED Dicroica', 6.00, 11.90, 250, 25, true),
('LED-PAR-7W', 'Lampada LED PAR20 7W', 'LED PAR', 10.00, 19.90, 120, 10, true),
('LED-PAR-11W', 'Lampada LED PAR30 11W', 'LED PAR', 15.00, 29.90, 80, 10, true),
('LED-FIL-4W', 'Lampada LED Filamento Vintage 4W', 'LED Filamento', 9.30, 18.50, 100, 10, true),
('LED-PAN-18W', 'Painel LED Embutir Quadrado 18W', 'Painel LED', 16.00, 32.00, 60, 5, true),
('LED-PAN-24W', 'Painel LED Embutir Redondo 24W', 'Painel LED', 21.00, 42.00, 40, 5, true),
('FLU-COM-15W', 'Lampada Fluorescente Compacta 15W', 'Fluorescente', 4.80, 9.50, 400, 40, true),
('HAL-PAL-70W', 'Lampada Halogena Palito 70W', 'Halogena', 4.00, 7.90, 350, 30, true),
('LED-FIT-5M', 'Fita LED 5 metros 14.4W/m RGB', 'Fita LED', 33.00, 65.00, 30, 3, true),
('LED-SPOT-3W', 'Spot LED Embutir 3W Redondo', 'Spot LED', 7.50, 15.00, 200, 20, true);

-- =============================================
-- PEDIDOS DE SIMULACAO (50 pedidos, ultimos 6 meses)
-- Status: EM_ABERTO, CONFIRMADO, FINALIZADO, CANCELADO
-- =============================================

-- NOVEMBRO 2025
INSERT INTO pedidos (numero, data_pedido, cliente_id, status) VALUES
('PED-2025-001', '2025-11-05', 1, 'FINALIZADO'),
('PED-2025-002', '2025-11-12', 2, 'FINALIZADO'),
('PED-2025-003', '2025-11-18', 3, 'FINALIZADO'),
('PED-2025-004', '2025-11-25', 4, 'CANCELADO'),
('PED-2025-005', '2025-11-28', 5, 'FINALIZADO');

-- DEZEMBRO 2025
INSERT INTO pedidos (numero, data_pedido, cliente_id, status) VALUES
('PED-2025-006', '2025-12-03', 6, 'FINALIZADO'),
('PED-2025-007', '2025-12-08', 7, 'FINALIZADO'),
('PED-2025-008', '2025-12-15', 8, 'FINALIZADO'),
('PED-2025-009', '2025-12-18', 1, 'FINALIZADO'),
('PED-2025-010', '2025-12-22', 2, 'CANCELADO'),
('PED-2025-011', '2025-12-28', 3, 'FINALIZADO');

-- JANEIRO 2026
INSERT INTO pedidos (numero, data_pedido, cliente_id, status) VALUES
('PED-2026-001', '2026-01-05', 4, 'FINALIZADO'),
('PED-2026-002', '2026-01-10', 5, 'FINALIZADO'),
('PED-2026-003', '2026-01-15', 1, 'FINALIZADO'),
('PED-2026-004', '2026-01-20', 6, 'FINALIZADO'),
('PED-2026-005', '2026-01-25', 2, 'FINALIZADO'),
('PED-2026-006', '2026-01-28', 7, 'CANCELADO'),
('PED-2026-007', '2026-01-30', 3, 'FINALIZADO');

-- FEVEREIRO 2026
INSERT INTO pedidos (numero, data_pedido, cliente_id, status) VALUES
('PED-2026-008', '2026-02-03', 8, 'FINALIZADO'),
('PED-2026-009', '2026-02-08', 1, 'FINALIZADO'),
('PED-2026-010', '2026-02-12', 4, 'FINALIZADO'),
('PED-2026-011', '2026-02-15', 2, 'FINALIZADO'),
('PED-2026-012', '2026-02-20', 5, 'FINALIZADO'),
('PED-2026-013', '2026-02-25', 3, 'FINALIZADO'),
('PED-2026-014', '2026-02-28', 6, 'CANCELADO');

-- MARCO 2026
INSERT INTO pedidos (numero, data_pedido, cliente_id, status) VALUES
('PED-2026-015', '2026-03-03', 7, 'FINALIZADO'),
('PED-2026-016', '2026-03-07', 1, 'FINALIZADO'),
('PED-2026-017', '2026-03-10', 8, 'FINALIZADO'),
('PED-2026-018', '2026-03-14', 2, 'FINALIZADO'),
('PED-2026-019', '2026-03-18', 4, 'FINALIZADO'),
('PED-2026-020', '2026-03-22', 5, 'CONFIRMADO'),
('PED-2026-021', '2026-03-25', 3, 'FINALIZADO'),
('PED-2026-022', '2026-03-28', 6, 'FINALIZADO'),
('PED-2026-023', '2026-03-30', 1, 'CONFIRMADO');

-- ABRIL 2026
INSERT INTO pedidos (numero, data_pedido, cliente_id, status) VALUES
('PED-2026-024', '2026-04-02', 7, 'FINALIZADO'),
('PED-2026-025', '2026-04-05', 2, 'FINALIZADO'),
('PED-2026-026', '2026-04-08', 8, 'CONFIRMADO'),
('PED-2026-027', '2026-04-10', 3, 'FINALIZADO'),
('PED-2026-028', '2026-04-12', 4, 'CONFIRMADO'),
('PED-2026-029', '2026-04-15', 5, 'EM_ABERTO'),
('PED-2026-030', '2026-04-18', 1, 'EM_ABERTO'),
('PED-2026-031', '2026-04-20', 6, 'EM_ABERTO'),
('PED-2026-032', '2026-04-22', 2, 'EM_ABERTO'),
('PED-2026-033', '2026-04-24', 8, 'EM_ABERTO');

-- =============================================
-- ITENS DOS PEDIDOS
-- =============================================

-- NOV/2025: PED-001 a 005 (pedidos 1-5)
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, valor_unitario, valor_total) VALUES
(1, 1, 200, 7.50, 1500.00), (1, 2, 100, 10.80, 1080.00), (1, 4, 50, 19.00, 950.00),
(2, 1, 300, 7.20, 2160.00), (2, 3, 80, 14.00, 1120.00), (2, 6, 60, 10.50, 630.00),
(3, 5, 100, 12.80, 1280.00), (3, 7, 40, 17.50, 700.00), (3, 9, 30, 16.00, 480.00),
(4, 2, 50, 10.50, 525.00), (4, 8, 20, 26.00, 520.00),
(5, 1, 500, 6.50, 3250.00), (5, 4, 200, 18.00, 3600.00), (5, 12, 150, 8.00, 1200.00);

-- DEZ/2025: PED-006 a 011 (pedidos 6-11)
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, valor_unitario, valor_total) VALUES
(6, 3, 120, 13.50, 1620.00), (6, 11, 25, 38.00, 950.00), (6, 14, 10, 58.00, 580.00),
(7, 1, 80, 7.60, 608.00), (7, 9, 50, 15.50, 775.00), (7, 15, 100, 12.80, 1280.00),
(8, 2, 150, 10.30, 1545.00), (8, 5, 80, 12.50, 1000.00), (8, 10, 30, 28.00, 840.00),
(9, 1, 250, 7.30, 1825.00), (9, 6, 100, 10.20, 1020.00), (9, 13, 80, 6.80, 544.00),
(10, 4, 60, 18.50, 1110.00), (10, 7, 30, 17.00, 510.00),
(11, 1, 180, 7.40, 1332.00), (11, 8, 25, 25.50, 637.50), (11, 11, 15, 37.50, 562.50);

-- JAN/2026: PED-2026-001 a 007 (pedidos 12-18)
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, valor_unitario, valor_total) VALUES
(12, 1, 300, 7.00, 2100.00), (12, 3, 100, 13.80, 1380.00), (12, 10, 20, 27.50, 550.00),
(13, 2, 200, 10.50, 2100.00), (13, 5, 120, 12.60, 1512.00), (13, 14, 15, 57.00, 855.00),
(14, 1, 400, 7.10, 2840.00), (14, 4, 80, 18.50, 1480.00), (14, 15, 60, 13.00, 780.00),
(15, 6, 150, 10.00, 1500.00), (15, 7, 60, 17.20, 1032.00), (15, 12, 200, 7.80, 1560.00),
(16, 1, 350, 7.10, 2485.00), (16, 2, 150, 10.40, 1560.00), (16, 9, 40, 15.80, 632.00),
(17, 3, 60, 14.00, 840.00), (17, 8, 30, 26.00, 780.00),
(18, 1, 200, 7.20, 1440.00), (18, 5, 80, 12.80, 1024.00), (18, 11, 20, 37.00, 740.00);

-- FEV/2026: PED-2026-008 a 014 (pedidos 19-25)
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, valor_unitario, valor_total) VALUES
(19, 2, 180, 10.60, 1908.00), (19, 4, 100, 18.80, 1880.00), (19, 13, 120, 6.90, 828.00),
(20, 1, 500, 7.00, 3500.00), (20, 6, 80, 10.30, 824.00), (20, 10, 25, 27.80, 695.00),
(21, 3, 150, 13.50, 2025.00), (21, 7, 70, 17.00, 1190.00), (21, 15, 80, 12.50, 1000.00),
(22, 1, 280, 7.10, 1988.00), (22, 2, 120, 10.50, 1260.00), (22, 14, 8, 58.00, 464.00),
(23, 5, 100, 12.40, 1240.00), (23, 8, 40, 25.00, 1000.00), (23, 9, 35, 15.50, 542.50),
(24, 1, 150, 7.30, 1095.00), (24, 12, 100, 8.10, 810.00), (24, 4, 60, 18.50, 1110.00),
(25, 11, 30, 38.00, 1140.00), (25, 6, 90, 10.20, 918.00);

-- MAR/2026: PED-2026-015 a 023 (pedidos 26-34)
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, valor_unitario, valor_total) VALUES
(26, 1, 100, 7.50, 750.00), (26, 9, 60, 16.00, 960.00), (26, 13, 100, 6.80, 680.00),
(27, 1, 600, 6.90, 4140.00), (27, 2, 200, 10.20, 2040.00), (27, 3, 100, 13.50, 1350.00),
(28, 4, 120, 18.00, 2160.00), (28, 5, 90, 12.50, 1125.00), (28, 10, 40, 27.00, 1080.00),
(29, 6, 120, 10.00, 1200.00), (29, 7, 80, 16.50, 1320.00), (29, 8, 50, 24.50, 1225.00),
(30, 1, 350, 7.00, 2450.00), (30, 14, 20, 55.00, 1100.00), (30, 15, 100, 12.00, 1200.00),
(31, 2, 250, 10.30, 2575.00), (31, 12, 180, 7.80, 1404.00),
(32, 1, 200, 7.20, 1440.00), (32, 3, 80, 13.80, 1104.00), (32, 11, 20, 37.50, 750.00),
(33, 5, 70, 12.60, 882.00), (33, 9, 45, 15.80, 711.00), (33, 6, 60, 10.50, 630.00),
(34, 1, 300, 7.10, 2130.00), (34, 4, 100, 18.50, 1850.00);

-- ABR/2026: PED-2026-024 a 033 (pedidos 35-44)
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, valor_unitario, valor_total) VALUES
(35, 7, 50, 17.50, 875.00), (35, 8, 30, 26.00, 780.00), (35, 14, 12, 57.00, 684.00),
(36, 1, 400, 7.00, 2800.00), (36, 2, 180, 10.40, 1872.00), (36, 15, 120, 12.80, 1536.00),
(37, 3, 100, 13.90, 1390.00), (37, 10, 35, 28.00, 980.00), (37, 12, 150, 8.00, 1200.00),
(38, 4, 80, 18.50, 1480.00), (38, 5, 100, 12.50, 1250.00), (38, 6, 70, 10.30, 721.00),
(39, 1, 250, 7.20, 1800.00), (39, 9, 40, 16.00, 640.00), (39, 11, 15, 38.00, 570.00),
(40, 1, 500, 6.80, 3400.00), (40, 2, 200, 10.20, 2040.00), (40, 13, 100, 6.50, 650.00),
(41, 3, 80, 14.00, 1120.00), (41, 7, 60, 17.00, 1020.00), (41, 14, 10, 58.00, 580.00),
(42, 1, 300, 7.10, 2130.00), (42, 4, 60, 18.80, 1128.00), (42, 8, 25, 25.50, 637.50),
(43, 5, 120, 12.40, 1488.00), (43, 6, 80, 10.50, 840.00), (43, 15, 90, 13.00, 1170.00),
(44, 2, 150, 10.50, 1575.00), (44, 10, 20, 28.00, 560.00), (44, 12, 200, 7.90, 1580.00);
