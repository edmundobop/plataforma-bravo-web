-- Criação da tabela de templates de checklist
CREATE TABLE IF NOT EXISTS checklist_templates (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    tipo_viatura VARCHAR(10) NOT NULL CHECK (tipo_viatura IN ('ABT', 'ABTF', 'UR', 'AV', 'ASA', 'MOB')),
    configuracao JSONB NOT NULL,
    padrao BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    usuario_criacao_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_checklist_templates_tipo_viatura ON checklist_templates(tipo_viatura);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_padrao ON checklist_templates(padrao);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_ativo ON checklist_templates(ativo);

-- Garantir que apenas um template seja padrão por tipo de viatura
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_templates_padrao_tipo 
ON checklist_templates(tipo_viatura) 
WHERE padrao = true;

-- Inserir templates padrão para cada tipo de viatura
INSERT INTO checklist_templates (nome, descricao, tipo_viatura, configuracao, padrao, ativo) VALUES
(
    'Template Padrão ABT',
    'Template padrão para Auto Bomba Tanque',
    'ABT',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": 1, "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": 3, "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": 4, "nome": "Nível de água do radiador", "obrigatorio": true},
            {"id": 5, "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": 6, "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": 7, "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": 8, "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": 9, "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": 10, "nome": "Funcionamento dos freios", "obrigatorio": true}
        ],
        "combatente": [
            {"id": 1, "nome": "Mangueiras de 38mm", "obrigatorio": true},
            {"id": 2, "nome": "Mangueiras de 63mm", "obrigatorio": true},
            {"id": 3, "nome": "Esguichos reguláveis", "obrigatorio": true},
            {"id": 4, "nome": "Chaves de mangueira", "obrigatorio": true},
            {"id": 5, "nome": "Bomba d''água", "obrigatorio": true},
            {"id": 6, "nome": "Nível do tanque de água", "obrigatorio": true},
            {"id": 7, "nome": "Equipamentos de proteção individual", "obrigatorio": true},
            {"id": 8, "nome": "Extintores portáteis", "obrigatorio": true},
            {"id": 9, "nome": "Ferramentas de corte", "obrigatorio": false},
            {"id": 10, "nome": "Kit de primeiros socorros", "obrigatorio": true}
        ]
    }',
    true,
    true
),
(
    'Template Padrão ABTF',
    'Template padrão para Auto Bomba Tanque Florestal',
    'ABTF',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": 1, "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": 3, "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": 4, "nome": "Nível de água do radiador", "obrigatorio": true},
            {"id": 5, "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": 6, "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": 7, "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": 8, "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": 9, "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": 10, "nome": "Funcionamento dos freios", "obrigatorio": true}
        ],
        "combatente": [
            {"id": 1, "nome": "Mangueiras florestais", "obrigatorio": true},
            {"id": 2, "nome": "Esguichos para combate florestal", "obrigatorio": true},
            {"id": 3, "nome": "Bomba d''água", "obrigatorio": true},
            {"id": 4, "nome": "Nível do tanque de água", "obrigatorio": true},
            {"id": 5, "nome": "Ferramentas de combate florestal", "obrigatorio": true},
            {"id": 6, "nome": "Abafadores", "obrigatorio": true},
            {"id": 7, "nome": "Pás e enxadas", "obrigatorio": true},
            {"id": 8, "nome": "Equipamentos de proteção individual", "obrigatorio": true},
            {"id": 9, "nome": "Kit de primeiros socorros", "obrigatorio": true},
            {"id": 10, "nome": "Sistema de comunicação", "obrigatorio": true}
        ]
    }',
    true,
    true
),
(
    'Template Padrão UR',
    'Template padrão para Unidade de Resgate',
    'UR',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": 1, "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": 3, "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": 4, "nome": "Nível de água do radiador", "obrigatorio": true},
            {"id": 5, "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": 6, "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": 7, "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": 8, "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": 9, "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": 10, "nome": "Funcionamento dos freios", "obrigatorio": true}
        ],
        "socorrista": [
            {"id": 1, "nome": "Kit de primeiros socorros completo", "obrigatorio": true},
            {"id": 2, "nome": "Desfibrilador", "obrigatorio": true},
            {"id": 3, "nome": "Cilindros de oxigênio", "obrigatorio": true},
            {"id": 4, "nome": "Prancha rígida", "obrigatorio": true},
            {"id": 5, "nome": "Colar cervical", "obrigatorio": true},
            {"id": 6, "nome": "Kit de imobilização", "obrigatorio": true},
            {"id": 7, "nome": "Equipamentos de corte e desencarceramento", "obrigatorio": true},
            {"id": 8, "nome": "Maca de resgate", "obrigatorio": true},
            {"id": 9, "nome": "Sistema de comunicação", "obrigatorio": true},
            {"id": 10, "nome": "Equipamentos de proteção individual", "obrigatorio": true}
        ]
    }',
    true,
    true
),
(
    'Template Padrão AV',
    'Template padrão para Auto Viatura',
    'AV',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": 1, "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": 3, "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": 4, "nome": "Nível de água do radiador", "obrigatorio": true},
            {"id": 5, "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": 6, "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": 7, "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": 8, "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": 9, "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": 10, "nome": "Funcionamento dos freios", "obrigatorio": true}
        ],
        "combatente": [
            {"id": 1, "nome": "Equipamentos de proteção individual", "obrigatorio": true},
            {"id": 2, "nome": "Ferramentas básicas", "obrigatorio": true},
            {"id": 3, "nome": "Kit de primeiros socorros", "obrigatorio": true},
            {"id": 4, "nome": "Extintores portáteis", "obrigatorio": true},
            {"id": 5, "nome": "Sistema de comunicação", "obrigatorio": true},
            {"id": 6, "nome": "Lanternas", "obrigatorio": true},
            {"id": 7, "nome": "Equipamentos de sinalização", "obrigatorio": true}
        ]
    }',
    true,
    true
),
(
    'Template Padrão ASA',
    'Template padrão para Auto Socorro de Altura',
    'ASA',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": 1, "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": 3, "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": 4, "nome": "Nível de água do radiador", "obrigatorio": true},
            {"id": 5, "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": 6, "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": 7, "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": 8, "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": 9, "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": 10, "nome": "Funcionamento dos freios", "obrigatorio": true}
        ],
        "socorrista": [
            {"id": 1, "nome": "Cordas de resgate", "obrigatorio": true},
            {"id": 2, "nome": "Cadeirinhas de rapel", "obrigatorio": true},
            {"id": 3, "nome": "Mosquetões", "obrigatorio": true},
            {"id": 4, "nome": "Freios de descida", "obrigatorio": true},
            {"id": 5, "nome": "Capacetes de segurança", "obrigatorio": true},
            {"id": 6, "nome": "Equipamentos de ancoragem", "obrigatorio": true},
            {"id": 7, "nome": "Kit de primeiros socorros", "obrigatorio": true},
            {"id": 8, "nome": "Sistema de comunicação", "obrigatorio": true},
            {"id": 9, "nome": "Maca de resgate em altura", "obrigatorio": true},
            {"id": 10, "nome": "Equipamentos de proteção individual", "obrigatorio": true}
        ]
    }',
    true,
    true
),
(
    'Template Padrão MOB',
    'Template padrão para Motocicleta',
    'MOB',
    '{
        "motorista": [
            {"id": "km_inicial", "nome": "KM Inicial", "obrigatorio": true, "tipo": "number"},
            {"id": "combustivel_inicial", "nome": "Combustível Inicial (%)", "obrigatorio": true, "tipo": "number"},
            {"id": 1, "nome": "Documentação da viatura", "obrigatorio": true},
            {"id": 3, "nome": "Nível de óleo do motor", "obrigatorio": true},
            {"id": 4, "nome": "Funcionamento dos faróis", "obrigatorio": true},
            {"id": 5, "nome": "Funcionamento das setas", "obrigatorio": true},
            {"id": 6, "nome": "Funcionamento do giroflex", "obrigatorio": true},
            {"id": 7, "nome": "Funcionamento da sirene", "obrigatorio": true},
            {"id": 8, "nome": "Estado dos pneus", "obrigatorio": true},
            {"id": 9, "nome": "Funcionamento dos freios", "obrigatorio": true},
            {"id": 10, "nome": "Corrente da motocicleta", "obrigatorio": true}
        ],
        "combatente": [
            {"id": 1, "nome": "Kit de primeiros socorros", "obrigatorio": true},
            {"id": 2, "nome": "Extintor portátil", "obrigatorio": true},
            {"id": 3, "nome": "Equipamentos de proteção individual", "obrigatorio": true},
            {"id": 4, "nome": "Sistema de comunicação", "obrigatorio": true},
            {"id": 5, "nome": "Lanterna", "obrigatorio": true},
            {"id": 6, "nome": "Equipamentos de sinalização", "obrigatorio": true}
        ]
    }',
    true,
    true
)
ON CONFLICT (nome) DO NOTHING;