const express = require('express');
const Task = require('../models/Task');
const Volunteer = require('../models/Volunteer');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { matchVolunteersToTask } = require('../services/claudeService');

const router = express.Router();

router.post('/:taskId', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const volunteers = await Volunteer.find({
      role: 'volunteer',
      availability: true,
    });

    const result = await matchVolunteersToTask(task, volunteers);
    task.aiSuggestions = result.matches.map((match) => ({
      volunteerId: match.volunteerId,
      name: match.name,
      score: match.score,
      reason: match.reason,
    }));
    await task.save();

    req.io.emit('ai_match_complete', {
      taskId: String(task._id),
      matches: result.matches,
    });

    return res.json({
      success: true,
      matches: result.matches,
    });
  } catch (error) {
    console.error('AI match error:', error);
    return res.status(500).json({ message: 'AI matching failed.', error: error.message });
  }
});

module.exports = router;
