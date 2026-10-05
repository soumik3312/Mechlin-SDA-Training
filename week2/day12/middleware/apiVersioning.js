const SUPPORTED_VERSIONS = ['v1'];
const DEFAULT_VERSION = 'v1';

function extractVersion(req) {
  const pathMatch = req.path.match(/^\/api\/(v\d+)(?:\/|$)/i);

  if (pathMatch) {
    return pathMatch[1].toLowerCase();
  }

  const acceptHeader = req.get('Accept') || '';
  const headerMatch = acceptHeader.match(
    /application\/vnd\.sda\.v(\d+)\+json/i
  );

  if (headerMatch) {
    return `v${headerMatch[1]}`;
  }

  return DEFAULT_VERSION;
}

function apiVersioning(req, res, next) {
  const version = extractVersion(req);

  if (!SUPPORTED_VERSIONS.includes(version)) {
    const error = new Error(`Unsupported API version: ${version}`);
    error.statusCode = 400;
    error.code = 'UNSUPPORTED_API_VERSION';
    return next(error);
  }

  req.apiVersion = version;
  res.setHeader('X-API-Version', version);

  next();
}

module.exports = apiVersioning;