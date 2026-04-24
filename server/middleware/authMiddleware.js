const jwt = require('jsonwebtoken');
const Volunteer = require('../models/Volunteer');

const JWT_SECRET = process.env.JWT_SECRET || 'volunteersync-dev-secret';

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearerToken || req.headers['x-auth-token'];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await Volunteer.findById(payload.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found for this token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have access to this resource.' });
    }

    next();
  };
}

module.exports = {
  protect,
  requireRole,
  JWT_SECRET,
};
