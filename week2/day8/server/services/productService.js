const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class ProductService extends EventEmitter {
  constructor() {
    super();

    this.products = new Map();
  }

  async initialize() {
    console.log('ProductService initialized');
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on('product:created', (product) => {
      console.log(`Product created: ${product.name}`);
    });

    this.on('product:updated', (product) => {
      console.log(`Product updated: ${product.name}`);
    });

    this.on('product:deleted', (productId) => {
      console.log(`Product deleted: ${productId}`);
    });
  }

  async createProduct(productData) {
    try {
      const {
        name,
        description = '',
        price,
        category,
        stock = 0,
      } = productData;

      if (!name || price === undefined || !category) {
        throw new Error(
          'Name, price, and category are required'
        );
      }

      const product = {
        id: uuidv4(),
        name,
        description,
        price: Number(price),
        category,
        stock: Number(stock),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.products.set(product.id, product);

      this.emit('product:created', product);

      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async getProductById(productId) {
    const product = this.products.get(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  async updateProduct(productId, updateData) {
    const product = this.products.get(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    Object.assign(product, updateData, {
      updatedAt: new Date(),
    });

    this.products.set(productId, product);

    this.emit('product:updated', product);

    return product;
  }

  async deleteProduct(productId) {
    const product = this.products.get(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    this.products.delete(productId);

    this.emit('product:deleted', productId);

    return {
      message: 'Product deleted successfully',
    };
  }

  async getAllProducts(filters = {}) {
    let products = Array.from(this.products.values());

    if (filters.category) {
      products = products.filter(
        (product) =>
          product.category === filters.category
      );
    }

    if (filters.isActive !== undefined) {
      products = products.filter(
        (product) =>
          product.isActive === filters.isActive
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();

      products = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm) ||
          product.description
            .toLowerCase()
            .includes(searchTerm)
      );
    }

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = products.length;

    const paginatedProducts = products
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .slice(skip, skip + limit);

    return {
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateStock(productId, quantity) {
    const product = this.products.get(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    const newStock = product.stock + Number(quantity);

    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }

    product.stock = newStock;
    product.updatedAt = new Date();

    this.products.set(productId, product);

    this.emit('product:updated', product);

    return product;
  }
}

module.exports = new ProductService();