const swaggerUi = require('swagger-ui-express');
const specs = require('../docs/openapi');

function setupSwagger(app) {
  // Serve the raw OpenAPI JSON specification.
  app.get('/api/v1/docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(specs);
  });

  // Serve interactive Swagger UI.
  app.use(
    '/api/v1/docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customSiteTitle: 'SDA Training API Documentation'
    })
  );
}

module.exports = {
  setupSwagger
};