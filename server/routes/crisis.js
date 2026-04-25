const express = require('express');
const Task = require('../models/Task');
const Volunteer = require('../models/Volunteer');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { matchVolunteersToTask } = require('../services/claudeService');

const router = express.Router();

// In-memory crisis state (coordinator can activate/deactivate)
let crisisState = {
  active: false,
  activatedAt: null,
  activatedBy: null,
  description: '',
  autoMatchResults: [],
};

// GET /api/crisis/status
router.get('/status', protect, (req, res) => {
  return res.json(crisisState);
});

// POST /api/crisis/activate — trigger crisis mode
router.post('/activate', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const { description = 'Emergency situation activated' } = req.body;

    crisisState = {
      active: true,
      activatedAt: new Date().toISOString(),
      activatedBy: req.user.name,
      description,
      autoMatchResults: [],
    };

    // Auto-match all open critical tasks
    const criticalTasks = await Task.find({
      urgency: 'Critical',
      status: 'Open',
    }).limit(5);

    const availableVolunteers = await Volunteer.find({
      role: 'volunteer',
      availability: true,
    });

    const autoMatchResults = [];

    for (const task of criticalTasks) {
      try {
        const result = await matchVolunteersToTask(task, availableVolunteers);
        if (result.matches.length) {
          autoMatchResults.push({
            taskId: String(task._id),
            taskTitle: task.title,
            zone: task.zone,
            topMatch: result.matches[0],
          });

          // Update task AI suggestions
          task.aiSuggestions = result.matches.map((m) => ({
            volunteerId: m.volunteerId,
            name: m.name,
            score: m.score,
            reason: m.reason,
          }));
          await task.save();
        }
      } catch (matchErr) {
        console.warn(`Auto-match failed for task ${task._id}:`, matchErr.message);
      }
    }

    crisisState.autoMatchResults = autoMatchResults;

    // Broadcast to all connected clients
    req.io.emit('crisis_activated', {
      ...crisisState,
      autoMatchCount: autoMatchResults.length,
    });

    return res.json({
      message: 'Crisis mode activated successfully.',
      crisis: crisisState,
    });
  } catch (error) {
    console.error('Crisis activate error:', error);
    return res.status(500).json({ message: 'Failed to activate crisis mode.' });
  }
});

// POST /api/crisis/deactivate
router.post('/deactivate', protect, requireRole('coordinator'), (req, res) => {
  crisisState = {
    active: false,
    activatedAt: null,
    activatedBy: null,
    description: '',
    autoMatchResults: [],
  };

  req.io.emit('crisis_deactivated', { deactivatedAt: new Date().toISOString() });

  return res.json({ message: 'Crisis mode deactivated.', crisis: crisisState });
});

module.exports = router;
