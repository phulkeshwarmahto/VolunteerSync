const express = require('express');
const Task = require('../models/Task');
const Volunteer = require('../models/Volunteer');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { matchVolunteersToTask, formTeamForTask, generateTasksFromCrisis } = require('../services/claudeService');

const router = express.Router();

// POST /api/match/:taskId — standard AI volunteer matching
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

// POST /api/match/:taskId/team — AI team formation (multi-role group)
router.post('/:taskId/team', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const volunteers = await Volunteer.find({
      role: 'volunteer',
      availability: true,
    });

    const result = await formTeamForTask(task, volunteers);

    req.io.emit('ai_team_formed', {
      taskId: String(task._id),
      team: result.team,
    });

    return res.json({
      success: true,
      team: result.team,
      teamRationale: result.teamRationale,
    });
  } catch (error) {
    console.error('Team formation error:', error);
    return res.status(500).json({ message: 'Team formation failed.', error: error.message });
  }
});

// POST /api/match/generate-tasks — AI auto-generate tasks from crisis description
router.post('/generate-tasks/from-crisis', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || description.trim().length < 10) {
      return res.status(400).json({ message: 'Crisis description must be at least 10 characters.' });
    }

    const result = await generateTasksFromCrisis(description.trim());

    return res.json({
      success: true,
      tasks: result.tasks,
    });
  } catch (error) {
    console.error('Auto-generate tasks error:', error);
    return res.status(500).json({ message: 'Task generation failed.', error: error.message });
  }
});

module.exports = router;

