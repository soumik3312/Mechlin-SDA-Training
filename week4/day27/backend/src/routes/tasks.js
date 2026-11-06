const express = require('express');
const Joi = require('joi');

const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().allow('').max(1000).default(''),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  status: Joi.string()
    .valid('pending', 'in_progress', 'completed')
    .default('pending'),
  dueDate: Joi.date().iso().allow(null).optional(),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120),
  description: Joi.string().allow('').max(1000),
  priority: Joi.string().valid('low', 'medium', 'high'),
  status: Joi.string().valid('pending', 'in_progress', 'completed'),
  dueDate: Joi.date().iso().allow(null),
}).min(1);

function emitTaskEvent(req, event, task) {
  const io = req.app.get('io');

  if (io) {
    io.to(`user:${req.user.id}`).emit(event, task);
  }
}

function createTasksRouter({ store, authenticate }) {
  const router = express.Router();

  router.use(authenticate);

  router.get('/', async (req, res, next) => {
    try {
      const tasks = await store.listTasks(req.user.id);

      return res.json({
        success: true,
        tasks,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { error, value } = createTaskSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      if (value.dueDate instanceof Date) {
        value.dueDate = value.dueDate.toISOString();
      }

      const task = await store.createTask(req.user.id, value);

      emitTaskEvent(req, 'task:created', task);

      await store.recordEvent(req.user.id, 'task_created');

      return res.status(201).json({
        success: true,
        task,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const { error, value } = updateTaskSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      if (value.dueDate instanceof Date) {
        value.dueDate = value.dueDate.toISOString();
      }

      const task = await store.updateTask(
        req.user.id,
        req.params.id,
        value,
      );

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found.',
        });
      }

      emitTaskEvent(req, 'task:updated', task);

      await store.recordEvent(req.user.id, 'task_updated');

      return res.json({
        success: true,
        task,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const task = await store.deleteTask(
        req.user.id,
        req.params.id,
      );

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found.',
        });
      }

      emitTaskEvent(req, 'task:deleted', { id: task.id });

      await store.recordEvent(req.user.id, 'task_deleted');

      return res.json({
        success: true,
        message: 'Task deleted successfully.',
        id: task.id,
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createTasksRouter };