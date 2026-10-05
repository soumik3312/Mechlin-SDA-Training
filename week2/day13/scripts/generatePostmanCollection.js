const fs = require('fs');
const path = require('path');

const specs =
  require('../docs/openapi');

function generatePostmanCollection(
  openApiSpec
) {
  const collection = {
    info: {
      name: 'SDA Training API',
      description:
        'Postman collection generated from the Day 13 OpenAPI specification.',
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },

    variable: [
      {
        key: 'base_url',
        value: 'http://localhost:3003/api/v1'
      },

      {
        key: 'jwt_token',
        value: ''
      }
    ],

    item: []
  };

  for (
    const apiPath of Object.keys(
      openApiSpec.paths || {}
    )
  ) {
    const pathItem =
      openApiSpec.paths[apiPath];

    for (
      const method of Object.keys(
        pathItem
      )
    ) {
      if (
        ![
          'get',
          'post',
          'put',
          'patch',
          'delete'
        ].includes(method)
      ) {
        continue;
      }

      const operation =
        pathItem[method];

      const headers = [];

      if (operation.security) {
        headers.push({
          key: 'Authorization',
          value: 'Bearer {{jwt_token}}',
          type: 'text'
        });
      }

      const request = {
        method: method.toUpperCase(),
        header: headers,
        url: {
          raw:
            '{{base_url}}' +
            apiPath,
          host: ['{{base_url}}'],
          path: apiPath
            .split('/')
            .filter(Boolean)
        }
      };

      if (operation.requestBody) {
        request.body = {
          mode: 'raw',
          raw: JSON.stringify(
            {},
            null,
            2
          ),
          options: {
            raw: {
              language: 'json'
            }
          }
        };

        headers.push({
          key: 'Content-Type',
          value: 'application/json',
          type: 'text'
        });
      }

      if (operation.parameters) {
        const queryParameters =
          operation.parameters.filter(
            (parameter) =>
              parameter.in === 'query'
          );

        if (
          queryParameters.length > 0
        ) {
          request.url.query =
            queryParameters.map(
              (parameter) => ({
                key: parameter.name,
                value:
                  parameter.schema?.default ||
                  '',
                description:
                  parameter.description ||
                  ''
              })
            );
        }
      }

      collection.item.push({
        name:
          operation.summary ||
          `${method.toUpperCase()} ${apiPath}`,

        request,

        response: []
      });
    }
  }

  return collection;
}

const collection =
  generatePostmanCollection(specs);

const outputPath =
  path.join(
    __dirname,
    '../docs/postman-collection.json'
  );

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    collection,
    null,
    2
  ),
  'utf8'
);

console.log(
  'Postman collection generated successfully!'
);

console.log(
  `Output: ${outputPath}`
);

module.exports = {
  generatePostmanCollection
};