const supportedVersions = ['v1', 'v2'];
const defaultVersion = 'v1';

const apiVersioning = (req, res, next) => {
  try {
    const versionMatch = req.path.match(/^\/api\/(v\d+)/);
    const urlVersion = versionMatch ? versionMatch[1] : null;

    const acceptHeader = req.headers.accept || '';
    const versionMatchHeader = acceptHeader.match(/version=([^,;]+)/);
    const headerVersion = versionMatchHeader
      ? versionMatchHeader[1].trim()
      : null;

    const apiVersion =
      urlVersion || headerVersion || defaultVersion;

    if (!supportedVersions.includes(apiVersion)) {
      const error = new Error(
        `API version ${apiVersion} is not supported. Supported versions: ${supportedVersions.join(', ')}`
      );

      error.statusCode = 400;
      error.code = 'UNSUPPORTED_API_VERSION';

      return next(error);
    }

    req.apiVersion = apiVersion;

    res.set('X-API-Version', apiVersion);

    next();
  } catch (error) {
    next(error);
  }
};

const versionSpecificRoutes = (version) => {
  return (req, res, next) => {
    req.versionSpecificRoutes = version;
    next();
  };
};

module.exports = {
  supportedVersions,
  defaultVersion,
  apiVersioning,
  versionSpecificRoutes,
};