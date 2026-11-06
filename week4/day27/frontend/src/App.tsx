import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { io } from 'socket.io-client';

import {
  aiApi,
  analyticsApi,
  authApi,
  getResponseText,
  taskApi,
  type ApiRecord,
  type Task,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
  type User,
} from './api';

type Page = 'overview' | 'tasks' | 'assistant' | 'analytics' | 'settings';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TaskFormState {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
}

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || window.location.origin;

const emptyTaskForm: TaskFormState = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  dueDate: '',
};

const navigation: { id: Page; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◫' },
  { id: 'tasks', label: 'My tasks', icon: '✓' },
  { id: 'assistant', label: 'AI assistant', icon: '✳' },
  { id: 'analytics', label: 'Analytics', icon: '▥' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

const statusLabels: Record<TaskStatus, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  completed: 'Completed',
};

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

function record(value: unknown): ApiRecord {
  return value !== null && typeof value === 'object'
    ? (value as ApiRecord)
    : {};
}

function readMetric(
  source: ApiRecord,
  keys: string[],
  fallback: number,
): number {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return fallback;
}

function formatDate(value?: string | null): string {
  if (!value) return 'No due date';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (result: { token: string; user: User }) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const result =
        mode === 'register'
          ? await authApi.register(name.trim(), email.trim(), password)
          : await authApi.login(email.trim(), password);

      onAuthenticated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-showcase">
        <div className="brand brand-large">
          <span className="brand-mark">✳</span>
          <span>TaskPilot<span className="brand-accent"> AI</span></span>
        </div>

        <div className="auth-showcase-content">
          <span className="eyebrow">YOUR WORK. WITH A SMARTER EDGE.</span>
          <h1>Make every day a little more <span>productive.</span></h1>
          <p>
            Organize your work, make progress visible, and get intelligent
            assistance when you need a new direction.
          </p>

          <div className="showcase-points">
            <div><span>✓</span> One place for all your tasks</div>
            <div><span>✳</span> AI-powered productivity assistance</div>
            <div><span>↗</span> Clear insights into your progress</div>
          </div>
        </div>

        <div className="showcase-footer">
          Built for focused work. Powered by intelligent assistance.
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="mobile-brand brand">
            <span className="brand-mark">✳</span>
            <span>TaskPilot<span className="brand-accent"> AI</span></span>
          </div>

          <span className="eyebrow">
            {mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}
          </span>

          <h2>
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </h2>

          <p className="muted">
            {mode === 'login'
              ? 'Pick up where you left off.'
              : 'Start organizing your work with TaskPilot AI.'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <label>
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  minLength={2}
                  required
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                minLength={8}
                required
              />
            </label>

            {error && <div className="inline-error">{error}</div>}

            <button className="button button-primary button-full" disabled={busy}>
              {busy
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
              <span>→</span>
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? "Don't have an account?" : 'Already registered?'}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
            >
              {mode === 'login' ? 'Create account' : 'Sign in'}
            </button>
          </div>

          <p className="auth-disclaimer">
            Your workspace is connected to your Day 27 backend.
          </p>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('taskpilot_token') ?? '',
  );

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('taskpilot_user');

    if (!saved) return null;

    try {
      return JSON.parse(saved) as User;
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState<Page>('overview');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [taskFilter, setTaskFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');

  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your TaskPilot AI assistant. Tell me what you're working on, and we'll plan your next steps together.",
    },
  ]);

  const [generationPrompt, setGenerationPrompt] = useState('');
  const [generationType, setGenerationType] = useState('social_post');
  const [generationBusy, setGenerationBusy] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  const [recommendationInput, setRecommendationInput] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recommendationBusy, setRecommendationBusy] = useState(false);

  const [analytics, setAnalytics] = useState<ApiRecord | null>(null);

  const loadTasks = useCallback(async () => {
    if (!token) return;

    setLoadingTasks(true);

    try {
      const result = await taskApi.list(token);
      setTasks(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tasks.');
    } finally {
      setLoadingTasks(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadTasks();
    }
  }, [token, loadTasks]);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 3,
      timeout: 8000,
    });

    socket.onAny(() => {
      void loadTasks();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, loadTasks]);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function handleAuthenticated(result: { token: string; user: User }) {
    localStorage.setItem('taskpilot_token', result.token);
    localStorage.setItem('taskpilot_user', JSON.stringify(result.user));

    setToken(result.token);
    setUser(result.user);
    setError('');
    setPage('overview');
  }

  function handleLogout() {
    localStorage.removeItem('taskpilot_token');
    localStorage.removeItem('taskpilot_user');

    setToken('');
    setUser(null);
    setTasks([]);
    setAnalytics(null);
    setChatMessages([
      {
        role: 'assistant',
        content: 'Hello! How can I help you plan your work today?',
      },
    ]);
    setPage('overview');
  }

  function openCreateTask() {
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm);
    setShowTaskForm(true);
  }

  function openEditTask(task: Task) {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    });
    setShowTaskForm(true);
  }

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) return;

    setBusy(true);
    setError('');

    const input: TaskInput = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority,
      status: taskForm.status,
      ...(taskForm.dueDate ? { dueDate: taskForm.dueDate } : {}),
    };

    try {
      if (editingTaskId) {
        await taskApi.update(token, editingTaskId, input);
        setNotice('Task updated successfully.');
      } else {
        await taskApi.create(token, input);
        setNotice('Task created successfully.');
      }

      setShowTaskForm(false);
      setEditingTaskId(null);
      setTaskForm(emptyTaskForm);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the task.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    if (!token) return;

    try {
      await taskApi.update(token, task.id, { status });
      setNotice('Task status updated.');
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status.');
    }
  }

  async function handleDeleteTask(task: Task) {
    if (!token) return;

    const confirmed = window.confirm(
      `Delete "${task.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await taskApi.remove(token, task.id);
      setNotice('Task deleted.');
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete task.');
    }
  }

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = chatInput.trim();

    if (!message || !token || chatBusy) return;

    const updatedMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: message },
    ];

    setChatMessages(updatedMessages);
    setChatInput('');
    setChatBusy(true);

    try {
      const response = await aiApi.chat(
        token,
        message,
        `capstone-${user?.id ?? 'web'}`,
      );

      setChatMessages([
        ...updatedMessages,
        { role: 'assistant', content: getResponseText(response) },
      ]);
    } catch (err) {
      setChatMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content:
            err instanceof Error
              ? `I couldn't reach the AI service: ${err.message}`
              : 'I could not reach the AI service.',
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!generationPrompt.trim() || !token || generationBusy) return;

    setGenerationBusy(true);
    setGeneratedContent('');
    setError('');

    try {
      const response = await aiApi.generate(
        token,
        generationPrompt.trim(),
        generationType,
      );

      setGeneratedContent(getResponseText(response));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Content generation failed.',
      );
    } finally {
      setGenerationBusy(false);
    }
  }

  async function handleRecommendations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recommendationInput.trim() || !token || recommendationBusy) return;

    setRecommendationBusy(true);
    setRecommendations([]);

    try {
      const response = await aiApi.recommendations(
        token,
        recommendationInput.trim(),
        5,
      );

      const data = record(response.data);
      const raw =
        response.recommendations ??
        response.suggestions ??
        data.recommendations ??
        data.suggestions;

      if (Array.isArray(raw)) {
        setRecommendations(
          raw.map((item) => {
            if (typeof item === 'string') return item;

            const itemRecord = record(item);
            return String(
              itemRecord.title ??
                itemRecord.text ??
                itemRecord.description ??
                JSON.stringify(item),
            );
          }),
        );
      } else {
        setRecommendations([getResponseText(response)]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not get recommendations.',
      );
    } finally {
      setRecommendationBusy(false);
    }
  }

  useEffect(() => {
    if (page !== 'analytics' || !token) return;

    let active = true;

    analyticsApi
      .get(token)
      .then((result) => {
        if (active) setAnalytics(result);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Could not load analytics.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [page, token]);

  const completedCount = tasks.filter(
    (task) => task.status === 'completed',
  ).length;

  const inProgressCount = tasks.filter(
    (task) => task.status === 'in-progress',
  ).length;

  const openCount = tasks.length - completedCount;

  const completionRate =
    tasks.length === 0
      ? 0
      : Math.round((completedCount / tasks.length) * 100);

  const visibleTasks = useMemo(() => {
    const search = taskSearch.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesFilter =
        taskFilter === 'all' || task.status === taskFilter;

      const matchesSearch =
        !search ||
        task.title.toLowerCase().includes(search) ||
        task.description.toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [tasks, taskFilter, taskSearch]);

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== 'completed')
        .slice(0, 4),
    [tasks],
  );

  const analyticsData = record(analytics?.analytics ?? analytics?.data ?? analytics);
  const analyticsTotal = readMetric(
    analyticsData,
    ['totalTasks', 'total', 'taskCount'],
    tasks.length,
  );
  const analyticsCompleted = readMetric(
    analyticsData,
    ['completedTasks', 'completed', 'completedCount'],
    completedCount,
  );
  const analyticsPending = readMetric(
    analyticsData,
    ['pendingTasks', 'openTasks', 'pending', 'open'],
    openCount,
  );
  const analyticsAi = readMetric(
    analyticsData,
    ['aiRequests', 'aiUsage', 'aiInteractions', 'totalAiRequests'],
    0,
  );

  if (!token || !user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand sidebar-brand">
          <span className="brand-mark">✳</span>
          <span>TaskPilot<span className="brand-accent"> AI</span></span>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => {
                setPage(item.id);
                setError('');
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {page === item.id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">✳</span>
            <strong>Work smarter</strong>
            <p>Let AI help you turn ideas into clear next steps.</p>
            <button onClick={() => setPage('assistant')}>
              Open assistant <span>→</span>
            </button>
          </div>

          <div className="profile-row">
            <div className="avatar">{getInitials(user.name)}</div>
            <div className="profile-details">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <button
              className="icon-button logout-button"
              title="Sign out"
              onClick={handleLogout}
            >
              ↗
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Workspace <span>/</span> {navigation.find((item) => item.id === page)?.label}</div>
            <h1>{navigation.find((item) => item.id === page)?.label}</h1>
          </div>

          <div className="topbar-actions">
            <span className="connection-indicator">
              <span className="connection-dot" /> Workspace
            </span>
            <button className="avatar top-avatar" title={user.name}>
              {getInitials(user.name)}
            </button>
          </div>
        </header>

        {(error || notice) && (
          <div className={`app-message ${error ? 'message-error' : 'message-success'}`}>
            <span>{error || notice}</span>
            <button onClick={() => { setError(''); setNotice(''); }}>×</button>
          </div>
        )}

        {page === 'overview' && (
          <section className="page-content">
            <div className="welcome-panel">
              <div className="welcome-copy">
                <span className="eyebrow">YOUR PRODUCTIVITY, AT A GLANCE</span>
                <h2>Good to see you, {user.name.split(' ')[0]}.</h2>
                <p>
                  Small, consistent steps make meaningful progress. Here's
                  what's happening in your workspace.
                </p>
                <button
                  className="button button-primary"
                  onClick={openCreateTask}
                >
                  <span>＋</span> Create a task
                </button>
              </div>

              <div className="welcome-art" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="orbit-core">✳</div>
                <span className="orbit-dot orbit-dot-one" />
                <span className="orbit-dot orbit-dot-two" />
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-heading">
                  <span>Total tasks</span>
                  <span className="stat-icon icon-violet">▤</span>
                </div>
                <strong>{tasks.length}</strong>
                <span className="stat-foot">In your workspace</span>
              </div>

              <div className="stat-card">
                <div className="stat-heading">
                  <span>In progress</span>
                  <span className="stat-icon icon-blue">◷</span>
                </div>
                <strong>{inProgressCount}</strong>
                <span className="stat-foot">Currently underway</span>
              </div>

              <div className="stat-card">
                <div className="stat-heading">
                  <span>Completed</span>
                  <span className="stat-icon icon-green">✓</span>
                </div>
                <strong>{completedCount}</strong>
                <span className="stat-foot">Successfully finished</span>
              </div>

              <div className="stat-card">
                <div className="stat-heading">
                  <span>Completion rate</span>
                  <span className="stat-icon icon-orange">↗</span>
                </div>
                <strong>{completionRate}%</strong>
                <span className="stat-foot">Based on all your tasks</span>
              </div>
            </div>

            <div className="dashboard-grid">
              <section className="panel task-overview-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">STAY ON TRACK</span>
                    <h3>Tasks to focus on</h3>
                  </div>
                  <button className="text-button" onClick={() => setPage('tasks')}>
                    View all <span>→</span>
                  </button>
                </div>

                {loadingTasks ? (
                  <div className="empty-state">Loading your tasks...</div>
                ) : todayTasks.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">✓</div>
                    <strong>You're all caught up.</strong>
                    <p>Create a task to plan your next step.</p>
                    <button className="text-button" onClick={openCreateTask}>
                      Create your first task →
                    </button>
                  </div>
                ) : (
                  <div className="task-list">
                    {todayTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onEdit={() => openEditTask(task)}
                        onStatusChange={(status) => void handleStatusChange(task, status)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="panel progress-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">YOUR MOMENTUM</span>
                    <h3>Progress overview</h3>
                  </div>
                </div>

                <div className="progress-ring-wrap">
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(var(--accent) ${completionRate}%, #292e3b ${completionRate}% 100%)`,
                    }}
                  >
                    <div className="progress-ring-inner">
                      <strong>{completionRate}%</strong>
                      <span>complete</span>
                    </div>
                  </div>
                </div>

                <div className="progress-legend">
                  <div><span className="legend-dot accent-dot" /> Completed <strong>{completedCount}</strong></div>
                  <div><span className="legend-dot muted-dot" /> Remaining <strong>{openCount}</strong></div>
                </div>
              </section>
            </div>

            <section className="ai-banner">
              <div className="ai-banner-icon">✳</div>
              <div>
                <span className="eyebrow">YOUR AI PRODUCTIVITY PARTNER</span>
                <h3>Need help deciding what to do next?</h3>
                <p>Talk through your ideas and turn them into actionable steps.</p>
              </div>
              <button className="button button-secondary" onClick={() => setPage('assistant')}>
                Talk to AI <span>→</span>
              </button>
            </section>
          </section>
        )}

        {page === 'tasks' && (
          <section className="page-content">
            <div className="page-intro">
              <div>
                <span className="eyebrow">PLAN. ORGANIZE. COMPLETE.</span>
                <h2>Your tasks, your pace.</h2>
                <p>Keep everything you need to do in one organized space.</p>
              </div>
              <button className="button button-primary" onClick={openCreateTask}>
                ＋ New task
              </button>
            </div>

            <div className="task-toolbar">
              <input
                className="search-input"
                value={taskSearch}
                onChange={(event) => setTaskSearch(event.target.value)}
                placeholder="Search your tasks..."
              />

              <select
                value={taskFilter}
                onChange={(event) => setTaskFilter(event.target.value)}
                aria-label="Filter tasks"
              >
                <option value="all">All tasks</option>
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Task list <span className="count-pill">{visibleTasks.length}</span></h3>
                  <p className="muted">Manage your work and track progress.</p>
                </div>
                <button className="text-button" onClick={() => void loadTasks()}>
                  ↻ Refresh
                </button>
              </div>

              {loadingTasks ? (
                <div className="empty-state">Loading tasks...</div>
              ) : visibleTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">▤</div>
                  <strong>No matching tasks</strong>
                  <p>Create a task or adjust your search and filters.</p>
                </div>
              ) : (
                <div className="task-list">
                  {visibleTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onEdit={() => openEditTask(task)}
                      onDelete={() => void handleDeleteTask(task)}
                      onStatusChange={(status) => void handleStatusChange(task, status)}
                    />
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {page === 'assistant' && (
          <section className="page-content">
            <div className="page-intro">
              <div>
                <span className="eyebrow">INTELLIGENCE FOR YOUR WORKFLOW</span>
                <h2>Meet your AI assistant.</h2>
                <p>Ask questions, generate content, or get suggestions for your next move.</p>
              </div>
            </div>

            <div className="assistant-grid">
              <section className="panel chat-panel">
                <div className="panel-heading">
                  <div className="assistant-heading">
                    <div className="assistant-avatar">✳</div>
                    <div>
                      <h3>TaskPilot Assistant</h3>
                      <span className="online-label"><span /> Connected to your AI service</span>
                    </div>
                  </div>
                </div>

                <div className="chat-messages">
                  {chatMessages.map((message, index) => (
                    <div
                      key={`${index}-${message.role}`}
                      className={`chat-message ${message.role}`}
                    >
                      {message.role === 'assistant' && <div className="chat-avatar">✳</div>}
                      <div className="chat-bubble">{message.content}</div>
                    </div>
                  ))}

                  {chatBusy && (
                    <div className="chat-message assistant">
                      <div className="chat-avatar">✳</div>
                      <div className="chat-bubble typing-indicator">
                        <span /><span /><span />
                      </div>
                    </div>
                  )}
                </div>

                <form className="chat-form" onSubmit={handleChatSubmit}>
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ask something about your work..."
                    aria-label="Message the AI assistant"
                    disabled={chatBusy}
                  />
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={chatBusy || !chatInput.trim()}
                  >
                    Send ↗
                  </button>
                </form>
                <p className="chat-footnote">AI responses are generated by your configured local AI service.</p>
              </section>

              <div className="assistant-tools">
                <section className="panel generator-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">CREATE WITH AI</span>
                      <h3>Content studio</h3>
                    </div>
                    <span className="tool-icon">✧</span>
                  </div>

                  <form onSubmit={handleGenerate} className="stack-form">
                    <label>
                      Content type
                      <select
                        value={generationType}
                        onChange={(event) => setGenerationType(event.target.value)}
                      >
                        <option value="social_post">Social media post</option>
                        <option value="email">Professional email</option>
                        <option value="blog">Blog outline</option>
                        <option value="description">Product description</option>
                      </select>
                    </label>

                    <label>
                      What should AI create?
                      <textarea
                        value={generationPrompt}
                        onChange={(event) => setGenerationPrompt(event.target.value)}
                        placeholder="Describe the content you need..."
                        rows={4}
                        required
                      />
                    </label>

                    <button
                      className="button button-primary button-full"
                      disabled={generationBusy || !generationPrompt.trim()}
                    >
                      {generationBusy ? 'Generating...' : '✧ Generate content'}
                    </button>
                  </form>

                  {generatedContent && (
                    <div className="generated-output">
                      <div className="output-heading">
                        <strong>Generated result</strong>
                        <button
                          className="text-button"
                          onClick={() => void navigator.clipboard.writeText(generatedContent)}
                        >
                          Copy ↗
                        </button>
                      </div>
                      <p>{generatedContent}</p>
                    </div>
                  )}
                </section>

                <section className="panel recommendation-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">PLAN YOUR NEXT MOVE</span>
                      <h3>Smart recommendations</h3>
                    </div>
                    <span className="tool-icon">↗</span>
                  </div>

                  <form onSubmit={handleRecommendations} className="stack-form">
                    <label>
                      Describe your priorities
                      <textarea
                        rows={3}
                        value={recommendationInput}
                        onChange={(event) => setRecommendationInput(event.target.value)}
                        placeholder="What are you trying to achieve?"
                        required
                      />
                    </label>

                    <button
                      className="button button-secondary button-full"
                      disabled={recommendationBusy || !recommendationInput.trim()}
                    >
                      {recommendationBusy ? 'Thinking...' : 'Get recommendations'}
                    </button>
                  </form>

                  {recommendations.length > 0 && (
                    <div className="recommendation-results">
                      {recommendations.map((item, index) => (
                        <div key={index}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <p>{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </section>
        )}

        {page === 'analytics' && (
          <section className="page-content">
            <div className="page-intro">
              <div>
                <span className="eyebrow">MEASURE YOUR MOMENTUM</span>
                <h2>Progress that you can see.</h2>
                <p>A snapshot of your task activity and AI usage.</p>
              </div>
              <button className="button button-secondary" onClick={() => void loadTasks()}>
                ↻ Refresh tasks
              </button>
            </div>

            <div className="stats-grid analytics-stats">
              <div className="stat-card">
                <span className="stat-foot">Total tasks</span>
                <strong>{analyticsTotal}</strong>
                <span className="stat-icon icon-violet">▤</span>
              </div>
              <div className="stat-card">
                <span className="stat-foot">Completed</span>
                <strong>{analyticsCompleted}</strong>
                <span className="stat-icon icon-green">✓</span>
              </div>
              <div className="stat-card">
                <span className="stat-foot">Open tasks</span>
                <strong>{analyticsPending}</strong>
                <span className="stat-icon icon-blue">◷</span>
              </div>
              <div className="stat-card">
                <span className="stat-foot">AI interactions</span>
                <strong>{analyticsAi}</strong>
                <span className="stat-icon icon-orange">✳</span>
              </div>
            </div>

            <div className="analytics-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">TASK DISTRIBUTION</span>
                    <h3>Current status</h3>
                  </div>
                </div>

                {[
                  { label: 'To do', count: tasks.filter((task) => task.status === 'todo').length, color: 'bar-violet' },
                  { label: 'In progress', count: inProgressCount, color: 'bar-blue' },
                  { label: 'Completed', count: completedCount, color: 'bar-green' },
                ].map((item) => (
                  <div className="bar-row" key={item.label}>
                    <div className="bar-label">
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${item.color}`}
                        style={{
                          width: `${tasks.length ? (item.count / tasks.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </section>

              <section className="panel analytics-summary">
                <span className="eyebrow">COMPLETION RATE</span>
                <h3>Your progress</h3>
                <strong className="big-percentage">{completionRate}%</strong>
                <p>
                  {completedCount} of {tasks.length} tasks completed.
                  {tasks.length === 0 ? ' Create your first task to begin tracking progress.' : ''}
                </p>
                <div className="progress-track">
                  <div style={{ width: `${completionRate}%` }} />
                </div>
              </section>
            </div>

            <p className="analytics-note">
              Task distribution is calculated from your current task list.
              Additional activity metrics are supplied by the backend when available.
            </p>
          </section>
        )}

        {page === 'settings' && (
          <section className="page-content">
            <div className="page-intro">
              <div>
                <span className="eyebrow">YOUR WORKSPACE</span>
                <h2>Account settings</h2>
                <p>Review your account and application connection details.</p>
              </div>
            </div>

            <section className="panel settings-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">PROFILE</span>
                  <h3>Your account</h3>
                </div>
                <div className="avatar settings-avatar">{getInitials(user.name)}</div>
              </div>

              <div className="settings-row">
                <span>Full name</span>
                <strong>{user.name}</strong>
              </div>
              <div className="settings-row">
                <span>Email address</span>
                <strong>{user.email}</strong>
              </div>
              <div className="settings-row">
                <span>Authentication</span>
                <strong>JWT session</strong>
              </div>
              <div className="settings-row">
                <span>API endpoint</span>
                <strong className="settings-mono">
                  {import.meta.env.VITE_API_URL || '/api'}
                </strong>
              </div>
              <div className="settings-row">
                <span>AI gateway</span>
                <strong>Day 26 mobile AI gateway</strong>
              </div>

              <div className="settings-actions">
                <button className="button button-danger" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            </section>
          </section>
        )}

        <footer className="app-footer">
          <span>TaskPilot AI</span>
          <span>Day 27 Capstone Project</span>
        </footer>
      </main>

      {showTaskForm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowTaskForm(false);
            }
          }}
        >
          <section
            className="task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">WORKSPACE TASK</span>
                <h2 id="task-modal-title">
                  {editingTaskId ? 'Edit task' : 'Create a new task'}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowTaskForm(false)}
                aria-label="Close task form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="stack-form">
              <label>
                Task title
                <input
                  value={taskForm.title}
                  onChange={(event) =>
                    setTaskForm({ ...taskForm, title: event.target.value })
                  }
                  placeholder="e.g. Finish project documentation"
                  maxLength={120}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(event) =>
                    setTaskForm({ ...taskForm, description: event.target.value })
                  }
                  placeholder="Add some details..."
                />
              </label>

              <div className="form-two-columns">
                <label>
                  Priority
                  <select
                    value={taskForm.priority}
                    onChange={(event) =>
                      setTaskForm({
                        ...taskForm,
                        priority: event.target.value as TaskPriority,
                      })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={taskForm.status}
                    onChange={(event) =>
                      setTaskForm({
                        ...taskForm,
                        status: event.target.value as TaskStatus,
                      })
                    }
                  >
                    <option value="todo">To do</option>
                    <option value="in-progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
              </div>

              <label>
                Due date
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(event) =>
                    setTaskForm({ ...taskForm, dueDate: event.target.value })
                  }
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setShowTaskForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={busy}
                >
                  {busy
                    ? 'Saving...'
                    : editingTaskId
                      ? 'Save changes'
                      : 'Create task'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  onEdit: () => void;
  onDelete?: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  return (
    <div className={`task-row ${task.status === 'completed' ? 'task-is-complete' : ''}`}>
      <div className={`task-check ${task.status === 'completed' ? 'checked' : ''}`}>
        {task.status === 'completed' ? '✓' : '·'}
      </div>

      <div className="task-main">
        <strong>{task.title}</strong>
        {task.description && <p>{task.description}</p>}
        <span className="task-due">Due: {formatDate(task.dueDate)}</span>
      </div>

      <span className={`priority-pill priority-${task.priority}`}>
        {priorityLabels[task.priority] ?? 'Medium'}
      </span>

      <select
        className={`status-select status-${task.status}`}
        value={task.status}
        onChange={(event) =>
          onStatusChange(event.target.value as TaskStatus)
        }
        aria-label={`Change status for ${task.title}`}
      >
        {Object.entries(statusLabels).map(([value, label]) => (
          <option value={value} key={value}>{label}</option>
        ))}
      </select>

      <div className="task-actions">
        <button className="icon-button" title="Edit task" onClick={onEdit}>✎</button>
        {onDelete && (
          <button
            className="icon-button delete-action"
            title="Delete task"
            onClick={onDelete}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default App;