const express = require('express');
const bcrypt = require('bcryptjs');
const Volunteer = require('../models/Volunteer');
const Allocation = require('../models/Allocation');
const { protect, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

function canAccessProfile(requestingUser, targetUserId) {
  return requestingUser.role === 'coordinator' || String(requestingUser._id) === String(targetUserId);
}

router.get('/', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const query = { role: 'volunteer' };

    if (req.query.availableOnly !== 'false') {
      query.availability = true;
    }

    if (req.query.zone) {
      query['location.zone'] = req.query.zone;
    }

    if (req.query.skill) {
      query.skills = { $in: [req.query.skill] };
    }

    const volunteers = await Volunteer.find(query).sort({ availability: -1, totalTasks: -1, name: 1 });
    return res.json(volunteers);
  } catch (error) {
    console.error('List volunteers error:', error);
    return res.status(500).json({ message: 'Failed to fetch volunteers.' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (!canAccessProfile(req.user, req.params.id)) {
      return res.status(403).json({ message: 'You do not have access to this profile.' });
    }

    const volunteer = await Volunteer.findById(req.params.id);

    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found.' });
    }

    const activeAllocations = await Allocation.find({
      volunteer: volunteer._id,
      status: 'Active',
    }).populate('task');

    return res.json({
      volunteer,
      activeAllocations,
    });
  } catch (error) {
    console.error('Get volunteer error:', error);
    return res.status(500).json({ message: 'Failed to fetch volunteer.' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccessProfile(req.user, req.params.id)) {
      return res.status(403).json({ message: 'You do not have access to update this profile.' });
    }

    const volunteer = await Volunteer.findById(req.params.id).select('+password');

    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found.' });
    }

    const allowedFields = [
      'name',
      'skills',
      'location',
      'availability',
      'experience',
      'organization',
      'bio',
    ];

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        volunteer[field] = req.body[field];
      }
    });

    if (req.body.password) {
      volunteer.password = await bcrypt.hash(req.body.password, 10);
    }

    await volunteer.save();

    req.io.emit('volunteer_availability_changed', {
      volunteerId: String(volunteer._id),
      availability: volunteer.availability,
      volunteer,
    });

    return res.json(volunteer.toJSON());
  } catch (error) {
    console.error('Update volunteer error:', error);
    return res.status(500).json({ message: 'Failed to update volunteer.' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccessProfile(req.user, req.params.id)) {
      return res.status(403).json({ message: 'You do not have access to delete this profile.' });
    }

    const volunteer = await Volunteer.findById(req.params.id);

    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found.' });
    }

    await Allocation.updateMany(
      { volunteer: volunteer._id, status: 'Active' },
      { $set: { status: 'Cancelled', completedAt: new Date() } }
    );
    await volunteer.deleteOne();

    return res.json({ message: 'Volunteer removed successfully.' });
  } catch (error) {
    console.error('Delete volunteer error:', error);
    return res.status(500).json({ message: 'Failed to delete volunteer.' });
  }
});

module.exports = router;
