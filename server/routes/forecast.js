const express = require('express');
const Task = require('../models/Task');
const Volunteer = require('../models/Volunteer');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { forecastZoneDemand } = require('../services/claudeService');

const router = express.Router();

// GET /api/forecast/demand — predictive demand forecasting per zone
router.get('/demand', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [currentZones, historicalRaw, volunteerZones] = await Promise.all([
      // Current active task counts per zone
      Task.aggregate([
        { $match: { status: { $in: ['Open', 'Assigned', 'In Progress'] } } },
        {
          $group: {
            _id: { $ifNull: ['$zone', 'Unassigned'] },
            activeTasks: { $sum: 1 },
            criticalTasks: {
              $sum: { $cond: [{ $eq: ['$urgency', 'Critical'] }, 1, 0] },
            },
          },
        },
      ]),
      // Historical task completion data
      Task.aggregate([
        { $match: { status: 'Completed', completedAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $ifNull: ['$zone', 'Unassigned'] },
            completed: { $sum: 1 },
          },
        },
      ]),
      // Volunteer zone distribution
      Volunteer.aggregate([
        { $match: { role: 'volunteer' } },
        {
          $group: {
            _id: { $ifNull: ['$location.zone', 'Unassigned'] },
            volunteers: { $sum: 1 },
            availableVolunteers: {
              $sum: { $cond: ['$availability', 1, 0] },
            },
          },
        },
      ]),
    ]);

    // Merge zone data
    const zoneMap = new Map();

    currentZones.forEach((z) => {
      zoneMap.set(z._id, {
        zone: z._id,
        activeTasks: z.activeTasks,
        criticalTasks: z.criticalTasks,
        volunteers: 0,
        availableVolunteers: 0,
      });
    });

    volunteerZones.forEach((vz) => {
      const zone = vz._id || 'Unassigned';
      const existing = zoneMap.get(zone) || { zone, activeTasks: 0, criticalTasks: 0 };
      existing.volunteers = vz.volunteers;
      existing.availableVolunteers = vz.availableVolunteers;
      zoneMap.set(zone, existing);
    });

    const currentData = Array.from(zoneMap.values());
    const historicalData = historicalRaw.map((h) => ({
      zone: h._id,
      completed: h.completed,
      avgUrgency: 'Medium',
    }));

    const forecast = await forecastZoneDemand(historicalData, currentData);

    return res.json(forecast);
  } catch (error) {
    console.error('Demand forecast error:', error);
    return res.status(500).json({ message: 'Failed to generate demand forecast.' });
  }
});

module.exports = router;
