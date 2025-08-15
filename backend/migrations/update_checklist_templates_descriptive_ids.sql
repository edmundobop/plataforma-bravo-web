-- Migração para implementar IDs descritivos nos templates de checklist
-- Mantém compatibilidade com templates existentes

-- Inserir novos templates com IDs descritivos
INSERT INTO checklist_templates (nome, descricao, tipo_viatura, configuracao, padrao, ativo) VALUES
(
    'Template ABT - IDs Descritivos',
    'Template para Auto Bomba Tanque com IDs descritivos',
    'ABT',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": "documentacao_viatura", "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": "nivel_oleo_motor", "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": "nivel_agua_radiador", "nome": "Nível de água do radiador", "obrigatorio": true},
            {"id": "funcionamento_farois", "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": "funcionamento_setas", "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": "funcionamento_giroflex", "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": "funcionamento_sirene", "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": "estado_pneus", "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": "funcionamento_freios", "nome": "Funcionamento dos freios", "obrigatorio": true}
        ],
        "combatente": [
            {"id": "mangueiras_38mm", "nome": "Mangueiras de 38mm", "obrigatorio": true},
            {"id": "mangueiras_63mm", "nome": "Mangueiras de 63mm", "obrigatorio": true},
            {"id": "esguichos_regulaveis", "nome": "Esguichos reguláveis", "obrigatorio": true},
            {"id": "chaves_mangueira", "nome": "Chaves de mangueira", "obrigatorio": true},
            {"id": "bomba_agua", "nome": "Bomba d''água", "obrigatorio": true},
            {"id": "nivel_tanque_agua", "nome": "Nível do tanque de água", "obrigatorio": true},
            {"id": "equipamentos_epi", "nome": "Equipamentos de proteção individual", "obrigatorio": true},
            {"id": "extintores_portateis", "nome": "Extintores portáteis", "obrigatorio": true},
            {"id": "ferramentas_corte", "nome": "Ferramentas de corte", "obrigatorio": false},
            {"id": "kit_primeiros_socorros", "nome": "Kit de primeiros socorros", "obrigatorio": true}
        ]
    }',
    false,
    true
),
(
    'Template ABTF - IDs Descritivos',
    'Template para Auto Bomba Tanque Florestal com IDs descritivos',
    'ABTF',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": "documentacao_viatura", "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": "nivel_oleo_motor", "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": "nivel_agua_radiador", "nome": "Nível de água do radiador", "obrigatorio": true},
            {"id": "funcionamento_farois", "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": "funcionamento_setas", "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": "funcionamento_giroflex", "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": "funcionamento_sirene", "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": "estado_pneus", "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": "funcionamento_freios", "nome": "Funcionamento dos freios", "obrigatorio": true}
        ],
        "combatente": [
            {"id": "mangueiras_florestais", "nome": "Mangueiras florestais", "obrigatorio": true},
            {"id": "esguichos_combate_florestal", "nome": "Esguichos para combate florestal", "obrigatorio": true},
            {"id": "nivel_tanque_agua", "nome": "Nível do tanque de água", "obrigatorio": true},
            {"id": "ferramentas_combate_florestal", "nome": "Ferramentas de combate florestal", "obrigatorio": true},
            {"id": "abafadores", "nome": "Abafadores", "obrigatorio": true},
            {"id": "pas_enxadas", "nome": "Pás e enxadas", "obrigatorio": true},
            {"id": "equipamentos_epi", "nome": "Equipamentos de proteção individual", "obrigatorio": true},
            {"id": "kit_primeiros_socorros", "nome": "Kit de primeiros socorros", "obrigatorio": true},
            {"id": "sistema_comunicacao", "nome": "Sistema de comunicação", "obrigatorio": true}
        ]
    }',
    false,
    true
),
(
    'Template UR - IDs Descritivos',
    'Template para Unidade de Resgate com IDs descritivos',
    'UR',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": "documentacao_viatura", "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": "nivel_oleo_motor", "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": "nivel_agua_radiador", "nome": "Nível de água do radiador", "obrigatorio": true},
            {"id": "funcionamento_farois", "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": "funcionamento_setas", "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": "funcionamento_giroflex", "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": "estado_pneus", "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": "funcionamento_freios", "nome": "Funcionamento dos freios", "obrigatorio": true}
        ],
        "socorrista": [
            {"id": "kit_primeiros_socorros_completo", "nome": "Kit de primeiros socorros completo", "obrigatorio": true},
            {"id": "desfibrilador", "nome": "Desfibrilador", "obrigatorio": true},
            {"id": "cilindros_oxigenio", "nome": "Cilindros de oxigênio", "obrigatorio": true},
            {"id": "prancha_rigida", "nome": "Prancha rígida", "obrigatorio": true},
            {"id": "colar_cervical", "nome": "Colar cervical", "obrigatorio": true},
            {"id": "kit_imobilizacao", "nome": "Kit de imobilização", "obrigatorio": true},
            {"id": "equipamentos_corte_desencarceramento", "nome": "Equipamentos de corte e desencarceramento", "obrigatorio": true},
            {"id": "maca_resgate", "nome": "Maca de resgate", "obrigatorio": true},
            {"id": "sistema_comunicacao", "nome": "Sistema de comunicação", "obrigatorio": true},
            {"id": "equipamentos_epi", "nome": "Equipamentos de proteção individual", "obrigatorio": true}
        ]
    }',
    false,
    true
),
(
    'Template AV - IDs Descritivos',
    'Template para Auto Viatura com IDs descritivos',
    'AV',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": "nivel_oleo_motor", "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": "nivel_agua_radiador", "nome": "Nível de água do radiador", "obrigatorio": true},
            {"id": "funcionamento_farois", "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": "funcionamento_setas", "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": "funcionamento_giroflex", "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": "funcionamento_sirene", "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": "estado_pneus", "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": "funcionamento_freios", "nome": "Funcionamento dos freios", "obrigatorio": true}
        ],
        "combatente": [
            {"id": "equipamentos_epi", "nome": "Equipamentos de proteção individual", "obrigatorio": true},
            {"id": "ferramentas_basicas", "nome": "Ferramentas básicas", "obrigatorio": true},
            {"id": "kit_primeiros_socorros", "nome": "Kit de primeiros socorros", "obrigatorio": true},
            {"id": "extintores_portateis", "nome": "Extintores portáteis", "obrigatorio": true},
            {"id": "sistema_comunicacao", "nome": "Sistema de comunicação", "obrigatorio": true},
            {"id": "lanternas", "nome": "Lanternas", "obrigatorio": true},
            {"id": "equipamentos_sinalizacao", "nome": "Equipamentos de sinalização", "obrigatorio": true}
        ]
    }',
    false,
    true
),
(
    'Template ASA - IDs Descritivos',
    'Template para Auto Socorro de Altura com IDs descritivos',
    'ASA',
    '{
        "motorista": [
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": "documentacao_viatura", "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": "nivel_oleo_motor", "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": "nivel_agua_radiador", "nome": "Nível de água do radiador", "obrigatorio": true},
            {"id": "funcionamento_farois", "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": "funcionamento_setas", "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": "funcionamento_giroflex", "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": "funcionamento_sirene", "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": "estado_pneus", "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": "funcionamento_freios", "nome": "Funcionamento dos freios", "obrigatorio": true}
        ],
        "socorrista": [
            {"id": "cordas_resgate", "nome": "Cordas de resgate", "obrigatorio": true},
            {"id": "cadeirinhas_rapel", "nome": "Cadeirinhas de rapel", "obrigatorio": true},
            {"id": "mosquetoes", "nome": "Mosquetões", "obrigatorio": true},
            {"id": "freios_descida", "nome": "Freios de descida", "obrigatorio": true},
            {"id": "capacetes_seguranca", "nome": "Capacetes de segurança", "obrigatorio": true},
            {"id": "equipamentos_ancoragem", "nome": "Equipamentos de ancoragem", "obrigatorio": true},
            {"id": "kit_primeiros_socorros", "nome": "Kit de primeiros socorros", "obrigatorio": true},
            {"id": "maca_resgate_altura", "nome": "Maca de resgate em altura", "obrigatorio": true},
            {"id": "equipamentos_epi", "nome": "Equipamentos de proteção individual", "obrigatorio": true}
        ]
    }',
    false,
    true
),
(
    'Template MOB - IDs Descritivos',
    'Template para Motocicleta com IDs descritivos',
    'MOB',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": "documentacao_viatura", "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": "nivel_oleo_motor", "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": "funcionamento_farois", "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": "funcionamento_setas", "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": "funcionamento_giroflex", "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": "funcionamento_sirene", "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": "estado_pneus", "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": "funcionamento_freios", "nome": "Funcionamento dos freios", "obrigatorio": true},
            {"id": "corrente_motocicleta", "nome": "Corrente da motocicleta", "obrigatorio": true}
        ],
        "combatente": [
            {"id": "kit_primeiros_socorros", "nome": "Kit de primeiros socorros", "obrigatorio": true},
            {"id": "equipamentos_epi", "nome": "Equipamentos de proteção individual", "obrigatorio": true},
            {"id": "sistema_comunicacao", "nome": "Sistema de comunicação", "obrigatorio": true},
            {"id": "lanterna", "nome": "Lanterna", "obrigatorio": true},
            {"id": "equipamentos_sinalizacao", "nome": "Equipamentos de sinalização", "obrigatorio": true}
        ]
    }',
    false,
    true
)
ON CONFLICT (nome) DO NOTHING;

-- Comentário: Os novos templates usam IDs descritivos como:
-- - "documentacao_viatura" ao invés de 1
-- - "nivel_oleo_motor" ao invés de 3
-- - "funcionamento_farois" ao invés de 5
-- Isso torna os dados mais legíveis e autodocumentados
-- Os templates antigos permanecem para compatibilidade