const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const request = require('supertest');

const { createApp } = require('../src/app');
const { JsonStore } = require('../src/services/store');

const TEST_SECRET = 'day27-capstone-test-secret';

async function createContext() {
  const directory = await fs.mkdtemp(
    path.join(__dirname, '.test-data-')
  );

  const store = new JsonStore(directory);
  // Ensure initial file creation finishes before tests can clean up the directory.
  await store.ready;

  const aiService = {
    async chat(message, userId) {
      return {
        success: true,
        response: `Test AI response for: ${message}`,
        thread_id: `capstone-${userId}`,
        agent_type: 'conversation'
      };
    },

    async generateContent(input) {
      return {
        success: true,
        content: `Generated content about ${input.topic}`,
        metadata: { model: 'test-model' }
      };
    },

    async recommendations(profile, maximum) {
      return {
        success: true,
        ranking_method: 'test',
        recommendations: Array.from(
          { length: Math.min(maximum, 2) },
          (_, index) => ({
            id: `resource-${index + 1}`,
            title: `Resource ${index + 1}`,
            score: 1
          })
        )
      };
    }
  };

  const app = createApp({
    store,
    aiService,
    jwtSecret: TEST_SECRET
  });

  return {
    app,
    directory,
    cleanup: () => fs.rm(directory, { recursive: true, force: true })
  };
}

async function registerUser(app, email = 'test@example.com') {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Capstone Tester',
      email,
      password: 'SecureTest123!'
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.ok(response.body.token);

  return response.body;
}

test('health endpoint reports a healthy API', async () => {
  const context = await createContext();

  try {
    const response = await request(context.app).get('/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'healthy');
    assert.equal(response.body.service, 'sda-capstone-api');
  } finally {
    await context.cleanup();
  }
});

test('registration creates an account and returns a token', async () => {
  const context = await createContext();

  try {
    const result = await registerUser(context.app);

    assert.equal(result.user.email, 'test@example.com');
    assert.equal(result.user.name, 'Capstone Tester');
    assert.equal(typeof result.token, 'string');
  } finally {
    await context.cleanup();
  }
});

test('registration rejects duplicate email addresses', async () => {
  const context = await createContext();

  try {
    await registerUser(context.app);

    const response = await request(context.app)
      .post('/api/auth/register')
      .send({
        name: 'Another User',
        email: 'test@example.com',
        password: 'SecureTest123!'
      });

    assert.equal(response.status, 409);
  } finally {
    await context.cleanup();
  }
});

test('login authenticates a registered user', async () => {
  const context = await createContext();

  try {
    await registerUser(context.app);

    const response = await request(context.app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecureTest123!'
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.token);
  } finally {
    await context.cleanup();
  }
});

test('protected task routes reject unauthenticated requests', async () => {
  const context = await createContext();

  try {
    const response = await request(context.app).get('/api/tasks');

    assert.equal(response.status, 401);
  } finally {
    await context.cleanup();
  }
});

test('authenticated user can create, list, update and delete tasks', async () => {
  const context = await createContext();

  try {
    const account = await registerUser(context.app);
    const auth = { Authorization: `Bearer ${account.token}` };

    const created = await request(context.app)
      .post('/api/tasks')
      .set(auth)
      .send({
        title: 'Complete the capstone',
        description: 'Implement the full-stack app',
        priority: 'high'
      });

    assert.equal(created.status, 201);
    assert.equal(created.body.task.title, 'Complete the capstone');

    const taskId = created.body.task.id;

    const listed = await request(context.app)
      .get('/api/tasks')
      .set(auth);

    assert.equal(listed.status, 200);
    assert.equal(listed.body.tasks.length, 1);

    const updated = await request(context.app)
      .patch(`/api/tasks/${taskId}`)
      .set(auth)
      .send({ status: 'completed' });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.task.status, 'completed');

    const deleted = await request(context.app)
      .delete(`/api/tasks/${taskId}`)
      .set(auth);

    assert.equal(deleted.status, 200);

    const afterDelete = await request(context.app)
      .get('/api/tasks')
      .set(auth);

    assert.equal(afterDelete.body.tasks.length, 0);
  } finally {
    await context.cleanup();
  }
});

test('users cannot access another user tasks', async () => {
  const context = await createContext();

  try {
    const first = await registerUser(context.app, 'first@example.com');
    const second = await registerUser(context.app, 'second@example.com');

    const created = await request(context.app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${first.token}`)
      .send({ title: 'Private task' });

    const response = await request(context.app)
      .patch(`/api/tasks/${created.body.task.id}`)
      .set('Authorization', `Bearer ${second.token}`)
      .send({ status: 'completed' });

    assert.equal(response.status, 404);
  } finally {
    await context.cleanup();
  }
});

test('AI chat route uses the injected AI service', async () => {
  const context = await createContext();

  try {
    const account = await registerUser(context.app);

    const response = await request(context.app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ message: 'Hello capstone AI' });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.match(response.body.response, /Hello capstone AI/);
  } finally {
    await context.cleanup();
  }
});

test('content generation validates its request', async () => {
  const context = await createContext();

  try {
    const account = await registerUser(context.app);

    const invalid = await request(context.app)
      .post('/api/ai/generate')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ topic: 'Missing options' });

    assert.equal(invalid.status, 400);

    const valid = await request(context.app)
      .post('/api/ai/generate')
      .set('Authorization', `Bearer ${account.token}`)
      .send({
        content_type: 'article',
        topic: 'AI Task Management',
        tone: 'professional',
        length: 'short',
        keywords: ['AI', 'tasks']
      });

    assert.equal(valid.status, 200);
    assert.match(valid.body.content, /AI Task Management/);
  } finally {
    await context.cleanup();
  }
});

test('recommendations route enforces the upstream maximum of eight', async () => {
  const context = await createContext();

  try {
    const account = await registerUser(context.app);
    const auth = { Authorization: `Bearer ${account.token}` };

    const invalid = await request(context.app)
      .post('/api/ai/recommendations')
      .set(auth)
      .send({
        user_profile: { interests: ['AI'] },
        max_recommendations: 9
      });

    assert.equal(invalid.status, 400);

    const valid = await request(context.app)
      .post('/api/ai/recommendations')
      .set(auth)
      .send({
        user_profile: { interests: ['AI'] },
        max_recommendations: 5
      });

    assert.equal(valid.status, 200);
    assert.equal(valid.body.recommendations.length, 2);
  } finally {
    await context.cleanup();
  }
});

test('analytics returns task and AI usage counts', async () => {
  const context = await createContext();

  try {
    const account = await registerUser(context.app);
    const auth = { Authorization: `Bearer ${account.token}` };

    await request(context.app)
      .post('/api/tasks')
      .set(auth)
      .send({ title: 'Analytics task' });

    await request(context.app)
      .post('/api/ai/chat')
      .set(auth)
      .send({ message: 'Count this request' });

    const response = await request(context.app)
      .get('/api/analytics')
      .set(auth);

    assert.equal(response.status, 200);
    assert.equal(response.body.analytics.tasks.total, 1);
    assert.equal(response.body.analytics.ai.chatRequests, 1);
  } finally {
    await context.cleanup();
  }
});

test('unknown routes return a consistent JSON 404', async () => {
  const context = await createContext();

  try {
    const response = await request(context.app).get('/not-a-route');

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
  } finally {
    await context.cleanup();
  }
});