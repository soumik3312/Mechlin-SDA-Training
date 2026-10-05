const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'SDA Training API',
      version: '1.0.0',
      description:
        'Advanced backend API documentation for the SDA training program',

      contact: {
        name: 'API Support',
        email: 'support@sda-training.com',
        url: 'https://sda-training.com/support'
      },

      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },

    servers: [
      {
        url: 'http://localhost:3003/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.sda-training.com/v1',
        description: 'Production server'
      }
    ],

    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and account management'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Documentation',
        description: 'API documentation endpoints'
      }
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        },

        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication'
        }
      },

      schemas: {
        User: {
          type: 'object',

          required: [
            'id',
            'name',
            'email',
            'role',
            'isActive'
          ],

          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier',
              example: '550e8400-e29b-41d4-a716-446655440000'
            },

            name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'User full name',
              example: 'John Doe'
            },

            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            },

            role: {
              type: 'string',
              enum: ['user', 'admin', 'moderator'],
              description: 'User role',
              example: 'user'
            },

            isActive: {
              type: 'boolean',
              description: 'User account status',
              example: true
            },

            avatar: {
              type: 'string',
              format: 'uri',
              nullable: true,
              description: 'User avatar URL',
              example: 'https://example.com/avatar.jpg'
            },

            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
              example: '2026-10-06T00:00:00.000Z'
            },

            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
              example: '2026-10-06T00:00:00.000Z'
            }
          }
        },

        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],

          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'John Doe'
            },

            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },

            password: {
              type: 'string',
              minLength: 8,
              example: 'StrongPass@123'
            }
          }
        },

        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],

          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },

            password: {
              type: 'string',
              example: 'StrongPass@123'
            }
          }
        },

        TokenResponse: {
          type: 'object',

          properties: {
            accessToken: {
              type: 'string',
              description: 'Short-lived JWT access token'
            },

            refreshToken: {
              type: 'string',
              description: 'Long-lived JWT refresh token'
            }
          }
        },

        Pagination: {
          type: 'object',

          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              example: 1
            },

            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              example: 10
            },

            total: {
              type: 'integer',
              minimum: 0,
              example: 25
            },

            pages: {
              type: 'integer',
              minimum: 0,
              example: 3
            }
          }
        },

        Error: {
          type: 'object',

          properties: {
            success: {
              type: 'boolean',
              example: false
            },

            error: {
              type: 'object',

              properties: {
                message: {
                  type: 'string',
                  example: 'Validation failed'
                },

                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },

                details: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              }
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

apis: [
  path
    .resolve(__dirname, '../routes/*.js')
    .replace(/\\/g, '/'),

  path
    .resolve(__dirname, '../server/app.js')
    .replace(/\\/g, '/')
]
};

const specs = swaggerJSDoc(options);

module.exports = specs;