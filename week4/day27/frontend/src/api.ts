const API_BASE_URL = (
  import.meta.env.VITE_API_URL || '/api'
).replace(/\/$/, '');

export interface User {
  id: string;
  name: string;
  email: string;
}

export type TaskStatus = 'todo' | 'in-progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

type BackendTaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
}

export interface AuthResult {
  token: string;
  user: User;
}

export type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord {
  return value !== null && typeof value === 'object'
    ? (value as ApiRecord)
    : {};
}

function getErrorMessage(payload: unknown, fallback: string): string {
  const record = asRecord(payload);
  const nested = asRecord(record.error);

  if (typeof record.message === 'string') {
    return record.message;
  }

  if (typeof nested.message === 'string') {
    return nested.message;
  }

  if (typeof record.error === 'string') {
    return record.error;
  }

  return fallback;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Accept', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      'Cannot connect to the backend. Check that the Day 27 API is running on port 5000.',
    );
  }

  const responseText = await response.text();
  let payload: unknown = {};

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        payload,
        `Request failed with status ${response.status}`,
      ),
    );
  }

  return payload as T;
}

function normalizeUser(value: unknown): User {
  const record = asRecord(value);

  return {
    id: String(record.id ?? record._id ?? ''),
    name: String(record.name ?? 'User'),
    email: String(record.email ?? ''),
  };
}

function normalizeAuth(payload: unknown): AuthResult {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const rawUser = record.user ?? data.user;

  const token =
    record.token ??
    record.accessToken ??
    data.token ??
    data.accessToken;

  if (typeof token !== 'string' || !token) {
    throw new Error('Authentication response did not contain a token.');
  }

  if (!rawUser) {
    throw new Error('Authentication response did not contain user details.');
  }

  return {
    token,
    user: normalizeUser(rawUser),
  };
}

function toBackendStatus(status: TaskStatus): BackendTaskStatus {
  switch (status) {
    case 'todo':
      return 'pending';
    case 'in-progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
  }
}

function normalizeStatus(value: unknown): TaskStatus {
  switch (value) {
    case 'pending':
    case 'todo':
      return 'todo';

    case 'in_progress':
    case 'in-progress':
      return 'in-progress';

    case 'completed':
      return 'completed';

    default:
      return 'todo';
  }
}

function normalizeTask(value: unknown): Task {
  const record = asRecord(value);

  return {
    id: String(record.id ?? record._id ?? ''),
    title: String(record.title ?? 'Untitled task'),
    description: String(record.description ?? ''),
    status: normalizeStatus(record.status),
    priority: (record.priority ?? 'medium') as TaskPriority,
    dueDate:
      typeof record.dueDate === 'string' ? record.dueDate : null,
    createdAt:
      typeof record.createdAt === 'string'
        ? record.createdAt
        : undefined,
    updatedAt:
      typeof record.updatedAt === 'string'
        ? record.updatedAt
        : undefined,
  };
}

function extractTask(payload: unknown): Task {
  const record = asRecord(payload);
  const data = asRecord(record.data);

  const task =
    record.task ??
    data.task ??
    record.data ??
    payload;

  return normalizeTask(task);
}

function extractTasks(payload: unknown): Task[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeTask);
  }

  const record = asRecord(payload);
  const data = asRecord(record.data);

  const tasks =
    record.tasks ??
    data.tasks ??
    (Array.isArray(record.data) ? record.data : undefined);

  return Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
}

export const authApi = {
  async register(name: string, email: string, password: string) {
    const payload = await request<unknown>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    return normalizeAuth(payload);
  },

  async login(email: string, password: string) {
    const payload = await request<unknown>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    return normalizeAuth(payload);
  },
};

export const taskApi = {
  async list(token: string): Promise<Task[]> {
    const payload = await request<unknown>('/tasks', {}, token);
    return extractTasks(payload);
  },

  async create(token: string, input: TaskInput): Promise<Task> {
    const payload = await request<unknown>(
      '/tasks',
      {
        method: 'POST',
        body: JSON.stringify({
          title: input.title,
          description: input.description,
          priority: input.priority,
          status: toBackendStatus(input.status ?? 'todo'),
          ...(input.dueDate ? { dueDate: input.dueDate } : {}),
        }),
      },
      token,
    );

    return extractTask(payload);
  },

  async update(
    token: string,
    id: string,
    input: Partial<TaskInput>,
  ): Promise<Task> {
    const apiInput: Record<string, unknown> = { ...input };

    if (input.status) {
      apiInput.status = toBackendStatus(input.status);
    }

    const payload = await request<unknown>(
      `/tasks/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(apiInput),
      },
      token,
    );

    return extractTask(payload);
  },

  async remove(token: string, id: string): Promise<void> {
    await request<unknown>(
      `/tasks/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token,
    );
  },
};

export const aiApi = {
  chat(
    token: string,
    message: string,
    threadId?: string,
  ): Promise<ApiRecord> {
    // The backend creates a persistent thread ID from the authenticated user.
    // Do not send the frontend-only threadId field to its strict Joi schema.
    void threadId;

    return request<ApiRecord>(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      },
      token,
    );
  },

  generate(
    token: string,
    prompt: string,
    contentType: string,
  ): Promise<ApiRecord> {
    const contentTypes: Record<string, string> = {
      social_post: 'social-media',
      email: 'email',
      blog: 'blog-post',
      description: 'product-description',
    };

    return request<ApiRecord>(
      '/ai/generate',
      {
        method: 'POST',
        body: JSON.stringify({
          content_type: contentTypes[contentType] ?? 'article',
          topic: prompt,
          tone: 'professional',
          length: 'medium',
          keywords: [],
        }),
      },
      token,
    );
  },

  recommendations(
    token: string,
    taskContext: string,
    limit = 5,
  ): Promise<ApiRecord> {
    return request<ApiRecord>(
      '/ai/recommendations',
      {
        method: 'POST',
        body: JSON.stringify({
          user_profile: {
            interests: taskContext,
            experience: 'beginner',
          },
          max_recommendations: limit,
        }),
      },
      token,
    );
  },
};

export const analyticsApi = {
  get(token: string): Promise<ApiRecord> {
    return request<ApiRecord>('/analytics', {}, token);
  },
};

export function getResponseText(payload: unknown): string {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const result = asRecord(record.result);

  const candidates = [
    record.response,
    record.reply,
    record.message,
    record.content,
    record.text,
    data.response,
    data.content,
    data.text,
    result.response,
    result.content,
    result.text,
  ];

  const value = candidates.find(
    (candidate) =>
      typeof candidate === 'string' && candidate.trim().length > 0,
  );

  return typeof value === 'string'
    ? value
    : 'The AI service returned a response, but no readable text was found.';
}