const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Plataforma BRAVO - API Documentation',
      version: '1.0.0',
      description: 'API para gerenciamento de recursos do Corpo de Bombeiros Militar de Goiás',
      contact: {
        name: 'Equipe de Desenvolvimento',
        email: 'dev@cbmgo.gov.br'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Servidor de Desenvolvimento'
      },
      {
        url: 'https://api.cbmgo.gov.br',
        description: 'Servidor de Produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT para autenticação'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['nome', 'email', 'matricula'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único do usuário'
            },
            nome: {
              type: 'string',
              description: 'Nome completo do usuário'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário'
            },
            matricula: {
              type: 'string',
              description: 'Matrícula do militar'
            },
            posto_graduacao: {
              type: 'string',
              description: 'Posto ou graduação do militar'
            },
            setor: {
              type: 'string',
              description: 'Setor de trabalho'
            },
            role: {
              type: 'string',
              enum: ['admin', 'operador', 'usuario'],
              description: 'Nível de acesso do usuário'
            },
            ativo: {
              type: 'boolean',
              description: 'Status do usuário'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'senha'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário'
            },
            senha: {
              type: 'string',
              description: 'Senha do usuário'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Token JWT de autenticação'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro'
            }
          }
        },
        Veiculo: {
          type: 'object',
          required: ['placa', 'modelo', 'tipo'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único do veículo'
            },
            placa: {
              type: 'string',
              description: 'Placa do veículo'
            },
            modelo: {
              type: 'string',
              description: 'Modelo do veículo'
            },
            tipo: {
              type: 'string',
              enum: ['viatura', 'ambulancia', 'caminhao', 'moto', 'outros'],
              description: 'Tipo do veículo'
            },
            status: {
              type: 'string',
              enum: ['disponivel', 'em_uso', 'manutencao', 'inativo'],
              description: 'Status atual do veículo'
            },
            quilometragem: {
              type: 'number',
              description: 'Quilometragem atual'
            },
            setor_responsavel: {
              type: 'string',
              description: 'Setor responsável pelo veículo'
            }
          }
        },
        Item: {
          type: 'object',
          required: ['nome', 'categoria'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único do item'
            },
            nome: {
              type: 'string',
              description: 'Nome do item'
            },
            categoria: {
              type: 'string',
              description: 'Categoria do item'
            },
            quantidade_total: {
              type: 'integer',
              description: 'Quantidade total em estoque'
            },
            quantidade_disponivel: {
              type: 'integer',
              description: 'Quantidade disponível para empréstimo'
            },
            localizacao: {
              type: 'string',
              description: 'Localização do item no almoxarifado'
            },
            valor_unitario: {
              type: 'number',
              description: 'Valor unitário do item'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js'], // Caminho para os arquivos com anotações Swagger
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs
};