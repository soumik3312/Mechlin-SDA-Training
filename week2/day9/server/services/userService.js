const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const users = new Map();

const getJwtSecret = () =>
  process.env.JWT_SECRET || 'day9-development-secret';

const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

const createToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '1h' }
  );

const createUser = async ({ name, email, password, role = 'user' }) => {
  const normalizedEmail = email.toLowerCase().trim();

  for (const existingUser of users.values()) {
    if (existingUser.email === normalizedEmail) {
      const error = new Error('Email already exists');
      error.statusCode = 400;
      throw error;
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = {
    id: uuidv4(),
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.set(user.id, user);

  return sanitizeUser(user);
};

const authenticateUser = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = [...users.values()].find(
    (item) => item.email === normalizedEmail
  );

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatches) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  return {
    user: sanitizeUser(user),
    token: createToken(user),
  };
};

const getUserById = async (userId) => {
  const user = users.get(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return sanitizeUser(user);
};

const updateUser = async (userId, updates) => {
  const user = users.get(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (updates.email) {
    const normalizedEmail = updates.email.toLowerCase().trim();

    for (const existingUser of users.values()) {
      if (
        existingUser.id !== userId &&
        existingUser.email === normalizedEmail
      ) {
        const error = new Error('Email already exists');
        error.statusCode = 400;
        throw error;
      }
    }

    user.email = normalizedEmail;
  }

  if (updates.name) {
    user.name = updates.name.trim();
  }

  if (updates.password) {
    user.password = await bcrypt.hash(updates.password, 10);
  }

  if (updates.role) {
    user.role = updates.role;
  }

  user.updatedAt = new Date();

  users.set(userId, user);

  return sanitizeUser(user);
};

const deleteUser = async (userId) => {
  if (!users.has(userId)) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  users.delete(userId);
};

const logout = async () => {
  return true;
};

const getAllUsers = async (filters = {}, options = {}) => {
  let result = [...users.values()];

  if (filters.role) {
    result = result.filter((user) => user.role === filters.role);
  }

  if (filters.isActive !== undefined) {
    const active =
      filters.isActive === true || filters.isActive === 'true';

    result = result.filter((user) => user.isActive === active);
  }

  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;

  const startIndex = (page - 1) * limit;

  return {
    users: result
      .slice(startIndex, startIndex + limit)
      .map(sanitizeUser),
    pagination: {
      page,
      limit,
      total: result.length,
      totalPages: Math.ceil(result.length / limit),
    },
  };
};

module.exports = {
  createUser,
  authenticateUser,
  getUserById,
  updateUser,
  deleteUser,
  logout,
  getAllUsers,
};