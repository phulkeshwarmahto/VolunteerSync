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

router.get('/skill-gaps', protect, requireRole('coordinator'), async (req, res) => {
  try {
    // Get all required skills from open tasks per zone
    const openTasks = await Task.find({ status: { $in: ['Open', 'Assigned', 'In Progress'] } }).lean();
    const volunteers = await Volunteer.find({ role: 'volunteer' }).lean();

    // Build zone -> available skills map
    const zoneVolunteerSkills = {};
    volunteers.forEach((v) => {
      const zone = v.location?.zone || 'Unassigned';
      if (!zoneVolunteerSkills[zone]) zoneVolunteerSkills[zone] = new Set();
      (v.skills || []).forEach((skill) => zoneVolunteerSkills[zone].add(skill.toLowerCase().trim()));
    });

    // Build zone -> required skills map
    const zoneRequiredSkills = {};
    openTasks.forEach((t) => {
      const zone = t.zone || 'Unassigned';
      if (!zoneRequiredSkills[zone]) zoneRequiredSkills[zone] = {};
      (t.requiredSkills || []).forEach((skill) => {
        const s = skill.toLowerCase().trim();
        zoneRequiredSkills[zone][s] = (zoneRequiredSkills[zone][s] || 0) + 1;
      });
    });

    // Find gaps
    const gaps = [];
    Object.entries(zoneRequiredSkills).forEach(([zone, skillCounts]) => {
      const available = zoneVolunteerSkills[zone] || new Set();
      Object.entries(skillCounts).forEach(([skill, count]) => {
        if (!available.has(skill)) {
          gaps.push({ zone, skill, tasksNeedingSkill: count, volunteersWithSkill: 0 });
        } else {
          // Count volunteers with this skill in zone
          const cnt = volunteers.filter(
            (v) => (v.location?.zone || 'Unassigned') === zone &&
              (v.skills || []).map((s) => s.toLowerCase().trim()).includes(skill)
          ).length;
          if (cnt < count) {
            gaps.push({ zone, skill, tasksNeedingSkill: count, volunteersWithSkill: cnt });
          }
        }
      });
    });

    gaps.sort((a, b) => b.tasksNeedingSkill - a.tasksNeedingSkill);

    return res.json(gaps);
  } catch (error) {
    console.error('Skill gaps error:', error);
    return res.status(500).json({ message: 'Failed to fetch skill gaps.' });
  }
});

router.get('/leaderboard', protect, async (req, res) => {
  try {
    const volunteers = await Volunteer.find({ role: 'volunteer' })
      .select('name reputationScore totalPoints totalTasks badges location experience')
      .sort({ reputationScore: -1, totalPoints: -1, totalTasks: -1 })
      .limit(20);

    return res.json(volunteers);
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ message: 'Failed to fetch leaderboard.' });
  }
});

module.exports = router;

