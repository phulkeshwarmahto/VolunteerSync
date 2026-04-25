const express = require('express');
const Resource = require('../models/Resource');
const Task = require('../models/Task');
const Volunteer = require('../models/Volunteer');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { suggestResourceRedistribution } = require('../services/claudeService');

const router = express.Router();

// GET /api/resources — list all resources (filterable by zone/category)
router.get('/', protect, async (req, res) => {
  try {
    const query = {};
    if (req.query.zone) query.zone = req.query.zone;
    if (req.query.category) query.category = req.query.category;
    if (req.query.lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$threshold'] };
    }

    const resources = await Resource.find(query)
      .populate('lastUpdatedBy', 'name')
      .sort({ zone: 1, category: 1, name: 1 });

    return res.json(resources);
  } catch (error) {
    console.error('List resources error:', error);
    return res.status(500).json({ message: 'Failed to fetch resources.' });
  }
});

// GET /api/resources/summary — zone-grouped summary
router.get('/summary', protect, async (req, res) => {
  try {
    const summary = await Resource.aggregate([
      {
        $group: {
          _id: '$zone',
          totalItems: { $sum: 1 },
          categories: { $addToSet: '$category' },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ['$quantity', '$threshold'] }, 1, 0] },
          },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.json(summary.map((s) => ({
      zone: s._id,
      totalItems: s.totalItems,
      categories: s.categories,
      lowStockCount: s.lowStockCount,
      totalQuantity: s.totalQuantity,
    })));
  } catch (error) {
    console.error('Resource summary error:', error);
    return res.status(500).json({ message: 'Failed to fetch resource summary.' });
  }
});

// GET /api/resources/ai-redistribute — AI redistribution suggestions
router.get('/ai-redistribute', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const [resources, zones] = await Promise.all([
      Resource.find().lean(),
      Task.aggregate([
        {
          $group: {
            _id: '$zone',
            activeTasks: {
              $sum: { $cond: [{ $in: ['$status', ['Open', 'Assigned', 'In Progress']] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const volunteerZones = await Volunteer.aggregate([
      { $match: { role: 'volunteer' } },
      {
        $group: {
          _id: '$location.zone',
          volunteers: { $sum: 1 },
          availableVolunteers: {
            $sum: { $cond: ['$availability', 1, 0] },
          },
        },
      },
    ]);

    const zoneMap = new Map();
    zones.forEach((z) => zoneMap.set(z._id, { zone: z._id, activeTasks: z.activeTasks, volunteers: 0 }));
    volunteerZones.forEach((vz) => {
      const zone = vz._id || 'Unassigned';
      const existing = zoneMap.get(zone) || { zone, activeTasks: 0 };
      existing.volunteers = vz.volunteers;
      existing.availableVolunteers = vz.availableVolunteers;
      zoneMap.set(zone, existing);
    });

    const zonesArray = Array.from(zoneMap.values());
    const suggestions = await suggestResourceRedistribution(resources, zonesArray);

    return res.json(suggestions);
  } catch (error) {
    console.error('AI redistribute error:', error);
    return res.status(500).json({ message: 'Failed to generate redistribution suggestions.' });
  }
});

// POST /api/resources — create resource (coordinator only)
router.post('/', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const { name, category, quantity, unit, zone, threshold, notes } = req.body;

    if (!name || !category || !zone) {
      return res.status(400).json({ message: 'Name, category, and zone are required.' });
    }

    const resource = await Resource.create({
      name,
      category,
      quantity: quantity ?? 0,
      unit: unit || 'units',
      zone,
      threshold: threshold ?? 10,
      notes: notes || '',
      lastUpdatedBy: req.user._id,
    });

    const populated = await Resource.findById(resource._id).populate('lastUpdatedBy', 'name');
    req.io.emit('resource_created', populated);

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Create resource error:', error);
    return res.status(500).json({ message: 'Failed to create resource.' });
  }
});

// PUT /api/resources/:id — update resource
router.put('/:id', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const fields = ['name', 'category', 'quantity', 'unit', 'zone', 'threshold', 'notes'];
    fields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        resource[field] = req.body[field];
      }
    });
    resource.lastUpdatedBy = req.user._id;

    await resource.save();
    const populated = await Resource.findById(resource._id).populate('lastUpdatedBy', 'name');
    req.io.emit('resource_updated', populated);

    return res.json(populated);
  } catch (error) {
    console.error('Update resource error:', error);
    return res.status(500).json({ message: 'Failed to update resource.' });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    await resource.deleteOne();
    req.io.emit('resource_deleted', { resourceId: req.params.id });

    return res.json({ message: 'Resource deleted successfully.' });
  } catch (error) {
    console.error('Delete resource error:', error);
    return res.status(500).json({ message: 'Failed to delete resource.' });
  }
});

module.exports = router;
