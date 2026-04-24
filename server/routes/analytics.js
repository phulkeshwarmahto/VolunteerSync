const express = require('express');
const Volunteer = require('../models/Volunteer');
const Task = require('../models/Task');
const { protect, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

function startOfDay(date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

router.get('/overview', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const today = startOfDay(new Date());

    const [
      totalVolunteers,
      availableVolunteers,
      totalTasks,
      openTasks,
      completedToday,
      criticalPending,
      completedTasks,
      statusBreakdownRaw,
    ] = await Promise.all([
      Volunteer.countDocuments({ role: 'volunteer' }),
      Volunteer.countDocuments({ role: 'volunteer', availability: true }),
      Task.countDocuments(),
      Task.countDocuments({ status: { $in: ['Open', 'Assigned', 'In Progress'] } }),
      Task.countDocuments({ status: 'Completed', completedAt: { $gte: today } }),
      Task.countDocuments({ urgency: 'Critical', status: { $ne: 'Completed' } }),
      Task.countDocuments({ status: 'Completed' }),
      Task.aggregate([{ $group: { _id: '$status', value: { $sum: 1 } } }]),
    ]);

    const completionRate = totalTasks ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%';
    const statusBreakdown = statusBreakdownRaw.map((item) => ({
      name: item._id,
      value: item.value,
    }));

    return res.json({
      totalVolunteers,
      availableVolunteers,
      totalTasks,
      openTasks,
      completedToday,
      criticalPending,
      completionRate,
      statusBreakdown,
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    return res.status(500).json({ message: 'Failed to fetch overview analytics.' });
  }
});

router.get('/zones', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const [volunteerStats, taskStats] = await Promise.all([
      Volunteer.aggregate([
        { $match: { role: 'volunteer' } },
        {
          $group: {
            _id: { $ifNull: ['$location.zone', 'Unassigned'] },
            volunteers: { $sum: 1 },
            availableVolunteers: {
              $sum: {
                $cond: [{ $eq: ['$availability', true] }, 1, 0],
              },
            },
          },
        },
      ]),
      Task.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$zone', 'Unassigned'] },
            activeTasks: {
              $sum: {
                $cond: [{ $in: ['$status', ['Open', 'Assigned', 'In Progress']] }, 1, 0],
              },
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const zoneMap = new Map();

    volunteerStats.forEach((item) => {
      zoneMap.set(item._id, {
        zone: item._id || 'Unassigned',
        volunteers: item.volunteers,
        availableVolunteers: item.availableVolunteers,
        activeTasks: 0,
        completed: 0,
      });
    });

    taskStats.forEach((item) => {
      const zone = item._id || 'Unassigned';
      const current = zoneMap.get(zone) || {
        zone,
        volunteers: 0,
        availableVolunteers: 0,
        activeTasks: 0,
        completed: 0,
      };

      current.activeTasks = item.activeTasks;
      current.completed = item.completed;
      zoneMap.set(zone, current);
    });

    return res.json(Array.from(zoneMap.values()).sort((a, b) => a.zone.localeCompare(b.zone)));
  } catch (error) {
    console.error('Analytics zones error:', error);
    return res.status(500).json({ message: 'Failed to fetch zone analytics.' });
  }
});

router.get('/timeline', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const today = startOfDay(new Date());
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);

    const rawTimeline = await Task.aggregate([
      {
        $match: {
          status: 'Completed',
          completedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$completedAt',
            },
          },
          completed: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const lookup = new Map(rawTimeline.map((item) => [item._id, item.completed]));
    const timeline = [];

    for (let index = 0; index < 7; index += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      timeline.push({
        date: key,
        completed: lookup.get(key) || 0,
      });
    }

    return res.json(timeline);
  } catch (error) {
    console.error('Analytics timeline error:', error);
    return res.status(500).json({ message: 'Failed to fetch timeline analytics.' });
  }
});

module.exports = router;
