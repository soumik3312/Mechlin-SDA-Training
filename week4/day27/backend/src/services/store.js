const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

class JsonStore {
  constructor(directory = process.env.CAPSTONE_DATA_DIR || './data') {
    this.directory = path.resolve(directory);
    this.filePath = path.join(this.directory, 'capstone.json');
    this.writeQueue = Promise.resolve();
    this.ready = this.initialize();
  }

  async initialize() {
    await fs.mkdir(this.directory, { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);

      this.data = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        events: Array.isArray(parsed.events) ? parsed.events : []
      };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Could not read capstone data: ${error.message}`);
      }

      this.data = { users: [], tasks: [], events: [] };
      await this.persist();
    }
  }

  async persist() {
    const snapshot = JSON.stringify(this.data, null, 2);
    const temporaryPath = `${this.filePath}.${crypto.randomUUID()}.tmp`;

    this.writeQueue = this.writeQueue.then(async () => {
      await fs.writeFile(temporaryPath, snapshot, 'utf8');
      await fs.rename(temporaryPath, this.filePath);
    });

    return this.writeQueue;
  }

  async findUserByEmail(email) {
    await this.ready;
    return this.data.users.find((user) => user.email === email) || null;
  }

  async findUserById(id) {
    await this.ready;
    return this.data.users.find((user) => user.id === id) || null;
  }

  async createUser(user) {
    await this.ready;

    const record = {
      id: crypto.randomUUID(),
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      createdAt: new Date().toISOString()
    };

    this.data.users.push(record);
    await this.persist();
    return { ...record };
  }

  async listTasks(userId) {
    await this.ready;

    return this.data.tasks
      .filter((task) => task.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((task) => ({ ...task }));
  }

  async createTask(userId, input) {
    await this.ready;

    const now = new Date().toISOString();
    const task = {
      id: crypto.randomUUID(),
      userId,
      title: input.title,
      description: input.description || '',
      priority: input.priority || 'medium',
      status: input.status || 'pending',
      dueDate: input.dueDate || null,
      createdAt: now,
      updatedAt: now
    };

    this.data.tasks.push(task);
    await this.persist();
    return { ...task };
  }

  async updateTask(userId, taskId, changes) {
    await this.ready;

    const task = this.data.tasks.find(
      (item) => item.id === taskId && item.userId === userId
    );

    if (!task) return null;

    const allowed = ['title', 'description', 'priority', 'status', 'dueDate'];

    for (const key of allowed) {
      if (Object.hasOwn(changes, key)) {
        task[key] = changes[key];
      }
    }

    task.updatedAt = new Date().toISOString();
    await this.persist();
    return { ...task };
  }

  async deleteTask(userId, taskId) {
    await this.ready;

    const index = this.data.tasks.findIndex(
      (item) => item.id === taskId && item.userId === userId
    );

    if (index === -1) return null;

    const [deleted] = this.data.tasks.splice(index, 1);
    await this.persist();
    return { ...deleted };
  }

  async recordEvent(userId, feature) {
    await this.ready;

    this.data.events.push({
      id: crypto.randomUUID(),
      userId,
      feature,
      createdAt: new Date().toISOString()
    });

    // Keep the local demonstration store bounded.
    if (this.data.events.length > 10000) {
      this.data.events = this.data.events.slice(-8000);
    }

    await this.persist();
  }

  async getAnalytics(userId) {
    await this.ready;

    const tasks = this.data.tasks.filter((task) => task.userId === userId);
    const events = this.data.events.filter((event) => event.userId === userId);

    const completed = tasks.filter((task) => task.status === 'completed').length;
    const overdue = tasks.filter((task) => {
      return (
        task.status !== 'completed' &&
        task.dueDate &&
        new Date(task.dueDate).getTime() < Date.now()
      );
    }).length;

    return {
      tasks: {
        total: tasks.length,
        completed,
        pending: tasks.length - completed,
        overdue
      },
      ai: {
        chatRequests: events.filter((event) => event.feature === 'chat').length,
        contentGenerations: events.filter(
          (event) => event.feature === 'content_generation'
        ).length,
        recommendationRequests: events.filter(
          (event) => event.feature === 'recommendations'
        ).length
      },
      recentEvents: events.slice(-10).reverse()
    };
  }
}

module.exports = { JsonStore };