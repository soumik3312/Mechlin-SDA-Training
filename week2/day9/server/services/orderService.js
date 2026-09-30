const { v4: uuidv4 } = require('uuid');

const orders = new Map();

const createOrder = async (data, userId) => {
  const order = {
    id: uuidv4(),
    userId,
    items: data.items,
    shippingAddress: data.shippingAddress,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  orders.set(order.id, order);

  return order;
};

const getOrderById = async (orderId) => {
  const order = orders.get(orderId);

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  return order;
};

const getOrdersByUser = async (userId) => {
  return [...orders.values()].filter(
    (order) => order.userId === userId
  );
};

const updateOrderStatus = async (orderId, status) => {
  const order = await getOrderById(orderId);

  const allowedStatuses = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];

  if (!allowedStatuses.includes(status)) {
    const error = new Error('Invalid order status');
    error.statusCode = 400;
    throw error;
  }

  order.status = status;
  order.updatedAt = new Date();

  orders.set(orderId, order);

  return order;
};

const cancelOrder = async (orderId) => {
  return updateOrderStatus(orderId, 'cancelled');
};

const getAllOrders = async () => {
  return [...orders.values()];
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByUser,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
};