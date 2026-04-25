const express = require('express');
const Task = require('../models/Task');
const Volunteer = require('../models/Volunteer');
const Allocation = require('../models/Allocation');
const { protect, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

function taskQueryFromRequest(req) {
  const query = {};

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.zone) {
    query.zone = req.query.zone;
  }

  if (req.query.urgency) {
    query.urgency = req.query.urgency;
  }

  if (req.query.assignedTo) {
    query.assignedTo = req.query.assignedTo;
  }

  if (req.query.createdBy) {
    query.createdBy = req.query.createdBy;
  }

  return query;
}

function populateTask(query) {
  return query
    .populate('createdBy', 'name email role organization location')
    .populate('assignedTo', 'name email role skills location experience availability totalTasks');
}

async function setVolunteerAvailability(volunteerId, availability) {
  if (!volunteerId) {
    return;
  }

  await Volunteer.findByIdAndUpdate(volunteerId, { availability });
}

router.get('/', protect, async (req, res) => {
  try {
    const tasks = await populateTask(Task.find(taskQueryFromRequest(req))).sort({
      createdAt: -1,
      urgency: -1,
    });
    return res.json(tasks);
  } catch (error) {
    console.error('List tasks error:', error);
    return res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const task = await populateTask(Task.findById(req.params.id));

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    return res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({ message: 'Failed to fetch task.' });
  }
});

router.post('/', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const { title, description, requiredSkills = [], urgency, zone, location = {} } = req.body;

    if (!title || !zone) {
      return res.status(400).json({ message: 'Title and zone are required.' });
    }

    const task = await Task.create({
      title,
      description,
      requiredSkills,
      urgency: urgency || 'Medium',
      zone,
      location: {
        lat: location.lat ?? null,
        lng: location.lng ?? null,
      },
      createdBy: req.user._id,
    });

    const populatedTask = await populateTask(Task.findById(task._id));
    req.io.emit('task_created', populatedTask);

    return res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ message: 'Failed to create task.' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const isCoordinator = req.user.role === 'coordinator';
    const isAssignedVolunteer = String(task.assignedTo || '') === String(req.user._id);

    if (!isCoordinator && !isAssignedVolunteer) {
      return res.status(403).json({ message: 'You do not have permission to update this task.' });
    }

    const previousAssignedTo = task.assignedTo ? String(task.assignedTo) : null;

    if (isCoordinator) {
      const editableFields = ['title', 'description', 'requiredSkills', 'urgency', 'zone', 'location'];
      editableFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          task[field] = req.body[field];
        }
      });

      if (Object.prototype.hasOwnProperty.call(req.body, 'assignedTo')) {
        const nextAssignedTo = req.body.assignedTo || null;

        if (nextAssignedTo) {
          const volunteer = await Volunteer.findOne({
            _id: nextAssignedTo,
            role: 'volunteer',
          });

          if (!volunteer) {
            return res.status(404).json({ message: 'Assigned volunteer not found.' });
          }

          if (previousAssignedTo && previousAssignedTo !== String(volunteer._id)) {
            await setVolunteerAvailability(previousAssignedTo, true);
            await Allocation.updateMany(
              { task: task._id, volunteer: previousAssignedTo, status: 'Active' },
              { $set: { status: 'Cancelled', completedAt: new Date() } }
            );
          }

          task.assignedTo = volunteer._id;
          if (task.status === 'Open') {
            task.status = 'Assigned';
          }

          await setVolunteerAvailability(volunteer._id, false);
          await Allocation.findOneAndUpdate(
            { task: task._id, volunteer: volunteer._id },
            {
              $set: {
                task: task._id,
                volunteer: volunteer._id,
                status: 'Active',
                assignedAt: new Date(),
                completedAt: null,
              },
            },
            { upsert: true }
          );
        } else if (previousAssignedTo) {
          task.assignedTo = null;
          task.status = 'Open';
          await setVolunteerAvailability(previousAssignedTo, true);
          await Allocation.updateMany(
            { task: task._id, volunteer: previousAssignedTo, status: 'Active' },
            { $set: { status: 'Cancelled', completedAt: new Date() } }
          );
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      task.status = req.body.status;
    }

    if (task.status === 'Completed') {
      if (!task.completedAt) {
        task.completedAt = new Date();
      }

      if (task.assignedTo) {
        await Allocation.updateMany(
          { task: task._id, volunteer: task.assignedTo, status: 'Active' },
          { $set: { status: 'Completed', completedAt: task.completedAt } }
        );

        // Award points and update reputation
        const urgencyPoints = { Low: 5, Medium: 10, Critical: 20 };
        const pointsEarned = urgencyPoints[task.urgency] || 10;

        const volunteer = await Volunteer.findById(task.assignedTo);
        if (volunteer) {
          volunteer.totalTasks += 1;
          volunteer.totalPoints = (volunteer.totalPoints || 0) + pointsEarned;
          volunteer.availability = true;

          // Update reputation score (weighted moving average)
          const currentRep = volunteer.reputationScore || 50;
          const taskWeight = Math.min(volunteer.totalTasks, 20);
          volunteer.reputationScore = Math.min(
            100,
            Math.round((currentRep * taskWeight + Math.min(100, currentRep + pointsEarned)) / (taskWeight + 1))
          );

          // Award milestone badges
          const newBadges = [];
          if (volunteer.totalTasks === 1 && !volunteer.badges.includes('First Responder'))
            newBadges.push('First Responder');
          if (volunteer.totalTasks === 5 && !volunteer.badges.includes('Committed'))
            newBadges.push('Committed');
          if (volunteer.totalTasks === 10 && !volunteer.badges.includes('Veteran'))
            newBadges.push('Veteran');
          if (volunteer.totalTasks === 25 && !volunteer.badges.includes('Elite'))
            newBadges.push('Elite');
          if (task.urgency === 'Critical' && !volunteer.badges.includes('Crisis Hero'))
            newBadges.push('Crisis Hero');

          if (newBadges.length) {
            volunteer.badges = [...(volunteer.badges || []), ...newBadges];
          }

          await volunteer.save();
        } else {
          await Volunteer.findByIdAndUpdate(task.assignedTo, {
            $inc: { totalTasks: 1, totalPoints: pointsEarned },
            $set: { availability: true },
          });
        }
      }
    } else if (task.status === 'In Progress' && task.assignedTo) {
      await setVolunteerAvailability(task.assignedTo, false);
    } else if (task.status === 'Open' && task.assignedTo) {
      await setVolunteerAvailability(task.assignedTo, true);
      await Allocation.updateMany(
        { task: task._id, volunteer: task.assignedTo, status: 'Active' },
        { $set: { status: 'Cancelled', completedAt: new Date() } }
      );
      task.assignedTo = null;
    }

    if (task.status !== 'Completed') {
      task.completedAt = null;
    }

    await task.save();
    const updatedTask = await populateTask(Task.findById(task._id));

    req.io.emit('task_updated', {
      taskId: String(updatedTask._id),
      task: updatedTask,
    });

    return res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ message: 'Failed to update task.' });
  }
});

router.delete('/:id', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.assignedTo) {
      await setVolunteerAvailability(task.assignedTo, true);
    }

    await Allocation.deleteMany({ task: task._id });
    await task.deleteOne();

    req.io.emit('task_deleted', { taskId: req.params.id });

    return res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ message: 'Failed to delete task.' });
  }
});

module.exports = router;
