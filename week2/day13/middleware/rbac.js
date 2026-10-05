const {
  AppError
} = require('./errorHandler');

const PERMISSIONS = {
  'users:read': [
    'admin',
    'moderator'
  ],

  'users:write': [
    'admin'
  ],

  'users:delete': [
    'admin'
  ]
};

function hasPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }

  const allowedRoles =
    PERMISSIONS[permission];

  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(
    user.role
  );
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        )
      );
    }

    if (
      !hasPermission(
        req.user,
        permission
      )
    ) {
      return next(
        new AppError(
          'Insufficient permissions',
          403,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
}

function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        )
      );
    }

    const allowed = permissions.some(
      (permission) =>
        hasPermission(
          req.user,
          permission
        )
    );

    if (!allowed) {
      return next(
        new AppError(
          'Insufficient permissions',
          403,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
}

module.exports = {
  PERMISSIONS,
  hasPermission,
  requirePermission,
  requireAnyPermission
};