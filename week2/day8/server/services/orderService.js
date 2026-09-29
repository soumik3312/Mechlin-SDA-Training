const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class OrderService extends EventEmitter {
  constructor() {
    super();

    this.orders = new Map();
  }

  async initialize() {
    console.log('OrderService initialized');
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on('order:created', (order) => {
      console.log(`Order created: ${order.id}`);
    });

    this.on('order:updated', (order) => {
      console.log(`Order updated: ${order.id}`);
    });

    this.on('order:cancelled', (orderId) => {
      console.log(`Order cancelled: ${orderId}`);
    });
  }

  async createOrder(orderData) {
    try {
      const {
        userId,
        items,
        shippingAddress = {},
      } = orderData;

      if (!userId || !Array.isArray(items) || items.length === 0) {
        throw new Error(
          'User ID and at least one order item are required'
        );
      }

      const totalAmount = items.reduce(
        (total, item) =>
          total +
          Number(item.price || 0) *
            Number(item.quantity || 1),
        0
      );

      const order = {
        id: uuidv4(),
        userId,
        items,
        totalAmount,
        shippingAddress,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.orders.set(order.id, order);

      this.emit('order:created', order);

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async getOrderById(orderId) {
    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  async getOrdersByUser(userId, filters = {}) {
    let orders = Array.from(this.orders.values()).filter(
      (order) => order.userId === userId
    );

    if (filters.status) {
      orders = orders.filter(
        (order) => order.status === filters.status
      );
    }

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = orders.length;

    const paginatedOrders = orders
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .slice(skip, skip + limit);

    return {
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrderStatus(orderId, status) {
    const validStatuses = [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      throw new Error('Invalid order status');
    }

    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    order.status = status;
    order.updatedAt = new Date();

    this.orders.set(orderId, order);

    this.emit('order:updated', order);

    if (status === 'cancelled') {
      this.emit('order:cancelled', orderId);
    }

    return order;
  }

  async cancelOrder(orderId) {
    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (
      ['shipped', 'delivered', 'cancelled'].includes(
        order.status
      )
    ) {
      throw new Error(
        'Order cannot be cancelled in its current status'
      );
    }

    order.status = 'cancelled';
    order.updatedAt = new Date();

    this.orders.set(orderId, order);

    this.emit('order:cancelled', orderId);
    this.emit('order:updated', order);

    return order;
  }

  async getAllOrders(filters = {}) {
    let orders = Array.from(this.orders.values());

    if (filters.status) {
      orders = orders.filter(
        (order) => order.status === filters.status
      );
    }

    if (filters.userId) {
      orders = orders.filter(
        (order) => order.userId === filters.userId
      );
    }

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = orders.length;

    const paginatedOrders = orders
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .slice(skip, skip + limit);

    return {
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new OrderService();