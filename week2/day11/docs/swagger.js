const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'SDA Training API',
      version: '1.0.0',
      description:
        'Production-oriented REST API demonstrating Day 11 best practices',
    },

    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local development server',
      },
    ],

    tags: [
      {
        name: 'System',
        description: 'API and health information',
      },
      {
        name: 'Users',
        description: 'User resource operations',
      },
      {
        name: 'Products',
        description: 'Product resource operations',
      },
      {
        name: 'Orders',
        description: 'Order resource operations',
      },
      {
        name: 'Analytics',
        description: 'Analytics endpoints',
      },
    ],

    components: {
      schemas: {
        User: {
          type: 'object',

          properties: {
            id: {
              type: 'string',
              example: 'user-1',
            },

            name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'Day 11 Demo User',
            },

            email: {
              type: 'string',
              format: 'email',
              example: 'demo@example.com',
            },

            role: {
              type: 'string',
              enum: [
                'user',
                'admin',
                'moderator',
              ],
              example: 'user',
            },

            isActive: {
              type: 'boolean',
              example: true,
            },
          },
        },

        Product: {
          type: 'object',

          required: [
            'name',
            'description',
            'price',
            'category',
            'stock',
          ],

          properties: {
            id: {
              type: 'string',
              example: 'product-1',
            },

            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'Training Laptop',
            },

            description: {
              type: 'string',
              minLength: 10,
              maxLength: 500,
              example:
                'Demo product for API testing.',
            },

            price: {
              type: 'number',
              minimum: 0,
              example: 79999,
            },

            category: {
              type: 'string',
              example: 'electronics',
            },

            stock: {
              type: 'integer',
              minimum: 0,
              example: 10,
            },
          },
        },

        Order: {
          type: 'object',

          properties: {
            id: {
              type: 'string',
              example: 'order-1',
            },

            userId: {
              type: 'string',
              example: 'user-1',
            },

            status: {
              type: 'string',
              enum: [
                'pending',
                'confirmed',
                'shipped',
                'delivered',
                'cancelled',
              ],
              example: 'pending',
            },

            totalAmount: {
              type: 'number',
              minimum: 0,
              example: 79999,
            },

            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        Error: {
          type: 'object',

          properties: {
            success: {
              type: 'boolean',
              example: false,
            },

            error: {
              type: 'object',

              properties: {
                message: {
                  type: 'string',
                  example:
                    'Validation failed',
                },

                code: {
                  type: 'string',
                  example:
                    'VALIDATION_ERROR',
                },

                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      },
    },

    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'API health check',

          responses: {
            200: {
              description:
                'API is operational',
            },
          },
        },
      },

      '/api/v1/': {
        get: {
          tags: ['System'],
          summary:
            'Get API information and available resources',

          responses: {
            200: {
              description:
                'API information',
            },
          },
        },
      },

      '/api/v1/users': {
        get: {
          tags: ['Users'],
          summary: 'List users',

          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 10,
              },
            },

            {
              name: 'offset',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 0,
                default: 0,
              },
            },
          ],

          responses: {
            200: {
              description:
                'Users returned successfully',
            },
          },
        },

        post: {
          tags: ['Users'],
          summary: 'Create a user',

          requestBody: {
            required: true,

            content: {
              'application/json': {
                schema: {
                  type: 'object',

                  required: [
                    'name',
                    'email',
                  ],

                  properties: {
                    name: {
                      type: 'string',
                      example:
                        'John Doe',
                    },

                    email: {
                      type: 'string',
                      format: 'email',
                      example:
                        'john@example.com',
                    },
                  },
                },
              },
            },
          },

          responses: {
            201: {
              description:
                'User created',
            },

            400: {
              description:
                'Validation error',
            },
          },
        },
      },

      '/api/v1/users/{userId}': {
        get: {
          tags: ['Users'],
          summary: 'Get a user',

          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,

              schema: {
                type: 'string',
              },
            },
          ],

          responses: {
            200: {
              description:
                'User returned',
            },

            404: {
              description:
                'User not found',
            },
          },
        },

        patch: {
          tags: ['Users'],
          summary: 'Update a user',

          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,

              schema: {
                type: 'string',
              },
            },
          ],

          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',

                  properties: {
                    name: {
                      type: 'string',
                    },

                    email: {
                      type: 'string',
                      format: 'email',
                    },
                  },
                },
              },
            },
          },

          responses: {
            200: {
              description:
                'User updated',
            },

            404: {
              description:
                'User not found',
            },
          },
        },

        delete: {
          tags: ['Users'],
          summary: 'Delete a user',

          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,

              schema: {
                type: 'string',
              },
            },
          ],

          responses: {
            204: {
              description:
                'User deleted',
            },

            404: {
              description:
                'User not found',
            },
          },
        },
      },

      '/api/v1/products': {
        get: {
          tags: ['Products'],
          summary: 'List products',

          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
              },
            },

            {
              name: 'offset',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 0,
              },
            },

            {
              name: 'category',
              in: 'query',
              schema: {
                type: 'string',
              },
            },

            {
              name: 'minPrice',
              in: 'query',
              schema: {
                type: 'number',
                minimum: 0,
              },
            },

            {
              name: 'maxPrice',
              in: 'query',
              schema: {
                type: 'number',
                minimum: 0,
              },
            },
          ],

          responses: {
            200: {
              description:
                'Products returned successfully',
            },

            400: {
              description:
                'Validation error',
            },
          },
        },

        post: {
          tags: ['Products'],
          summary: 'Create a product',

          requestBody: {
            required: true,

            content: {
              'application/json': {
                schema: {
                  $ref:
                    '#/components/schemas/Product',
                },
              },
            },
          },

          responses: {
            201: {
              description:
                'Product created',
            },

            400: {
              description:
                'Validation error',
            },
          },
        },
      },

      '/api/v1/products/{productId}': {
        get: {
          tags: ['Products'],
          summary: 'Get a product',

          parameters: [
            {
              name: 'productId',
              in: 'path',
              required: true,

              schema: {
                type: 'string',
              },
            },
          ],

          responses: {
            200: {
              description:
                'Product returned',
            },

            404: {
              description:
                'Product not found',
            },
          },
        },

        patch: {
          tags: ['Products'],
          summary: 'Update a product',

          parameters: [
            {
              name: 'productId',
              in: 'path',
              required: true,

              schema: {
                type: 'string',
              },
            },
          ],

          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref:
                    '#/components/schemas/Product',
                },
              },
            },
          },

          responses: {
            200: {
              description:
                'Product updated',
            },

            404: {
              description:
                'Product not found',
            },
          },
        },

        delete: {
          tags: ['Products'],
          summary: 'Delete a product',

          parameters: [
            {
              name: 'productId',
              in: 'path',
              required: true,

              schema: {
                type: 'string',
              },
            },
          ],

          responses: {
            204: {
              description:
                'Product deleted',
            },

            404: {
              description:
                'Product not found',
            },
          },
        },
      },

      '/api/v1/orders': {
        get: {
          tags: ['Orders'],
          summary: 'List orders',

          responses: {
            200: {
              description:
                'Orders returned successfully',
            },
          },
        },

        post: {
          tags: ['Orders'],
          summary: 'Create an order',

          requestBody: {
            required: true,

            content: {
              'application/json': {
                schema: {
                  type: 'object',

                  required: [
                    'userId',
                    'totalAmount',
                  ],

                  properties: {
                    userId: {
                      type: 'string',
                    },

                    totalAmount: {
                      type: 'number',
                      minimum: 0,
                    },
                  },
                },
              },
            },
          },

          responses: {
            201: {
              description:
                'Order created',
            },

            400: {
              description:
                'Validation error',
            },
          },
        },
      },

      '/api/v1/orders/{orderId}': {
        get: {
          tags: ['Orders'],
          summary: 'Get an order',

          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,

              schema: {
                type: 'string',
              },
            },
          ],

          responses: {
            200: {
              description:
                'Order returned',
            },

            404: {
              description:
                'Order not found',
            },
          },
        },
      },

      '/api/v1/orders/{orderId}/status': {
        patch: {
          tags: ['Orders'],
          summary: 'Update order status',

          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,

              schema: {
                type: 'string',
              },
            },
          ],

          requestBody: {
            required: true,

            content: {
              'application/json': {
                schema: {
                  type: 'object',

                  required: ['status'],

                  properties: {
                    status: {
                      type: 'string',

                      enum: [
                        'pending',
                        'confirmed',
                        'shipped',
                        'delivered',
                        'cancelled',
                      ],
                    },
                  },
                },
              },
            },
          },

          responses: {
            200: {
              description:
                'Order status updated',
            },

            400: {
              description:
                'Validation error',
            },

            404: {
              description:
                'Order not found',
            },
          },
        },
      },

      '/api/v1/analytics/summary': {
        get: {
          tags: ['Analytics'],
          summary:
            'Get analytics summary',

          responses: {
            200: {
              description:
                'Analytics returned successfully',
            },
          },
        },
      },

      '/api/v1/analytics/health': {
        get: {
          tags: ['Analytics'],
          summary:
            'Get analytics service health',

          responses: {
            200: {
              description:
                'Analytics service is operational',
            },
          },
        },
      },
    },
  },

  apis: [],
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi,
};