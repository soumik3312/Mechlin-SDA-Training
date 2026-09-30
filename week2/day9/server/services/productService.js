const { v4: uuidv4 } = require('uuid');

const products = new Map();

const createProduct = async (data) => {
  const product = {
    id: uuidv4(),
    name: data.name,
    description: data.description,
    price: Number(data.price),
    category: data.category,
    stock: Number(data.stock),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  products.set(product.id, product);

  return product;
};

const getProductById = async (productId) => {
  const product = products.get(productId);

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  return product;
};

const getAllProducts = async (filters = {}, options = {}) => {
  let result = [...products.values()];

  if (filters.category) {
    result = result.filter(
      (product) => product.category === filters.category
    );
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();

    result = result.filter(
      (product) =>
        product.name.toLowerCase().includes(search) ||
        product.description.toLowerCase().includes(search)
    );
  }

  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const startIndex = (page - 1) * limit;

  return {
    products: result.slice(startIndex, startIndex + limit),
    pagination: {
      page,
      limit,
      total: result.length,
      totalPages: Math.ceil(result.length / limit),
    },
  };
};

const updateProduct = async (productId, updates) => {
  const product = await getProductById(productId);

  Object.assign(product, updates, {
    updatedAt: new Date(),
  });

  products.set(productId, product);

  return product;
};

const deleteProduct = async (productId) => {
  if (!products.has(productId)) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  products.delete(productId);
};

const updateStock = async (productId, quantity) => {
  const product = await getProductById(productId);

  product.stock = Number(quantity);
  product.updatedAt = new Date();

  products.set(productId, product);

  return product;
};

module.exports = {
  createProduct,
  getProductById,
  getAllProducts,
  updateProduct,
  deleteProduct,
  updateStock,
};