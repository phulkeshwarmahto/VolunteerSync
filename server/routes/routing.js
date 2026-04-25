const express = require('express');
const { protect, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// OpenRouteService free API (no key needed for basic use, or add ORS_API_KEY in .env)
const ORS_BASE = 'https://api.openrouteservice.org/v2';

async function fetchOrsRoute(coordinates, apiKey) {
  const body = { coordinates };

  const response = await fetch(`${ORS_BASE}/directions/driving-car/json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`ORS API error: ${response.status}`);
  }

  return response.json();
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * POST /api/routing/optimize
 * Body: { origin: {lat, lng, label}, waypoints: [{lat, lng, label}] }
 * Returns optimized route with distance/duration, or haversine fallback
 */
router.post('/optimize', protect, requireRole('coordinator'), async (req, res) => {
  try {
    const { origin, waypoints = [] } = req.body;

    if (!origin || !origin.lat || !origin.lng) {
      return res.status(400).json({ message: 'Origin coordinates are required.' });
    }

    if (!waypoints.length) {
      return res.status(400).json({ message: 'At least one waypoint is required.' });
    }

    const apiKey = process.env.ORS_API_KEY;

    // Try ORS if API key is set
    if (apiKey) {
      try {
        const coordinates = [
          [origin.lng, origin.lat],
          ...waypoints.map((wp) => [wp.lng, wp.lat]),
        ];

        const orsResult = await fetchOrsRoute(coordinates, apiKey);
        const route = orsResult.routes?.[0];

        if (route) {
          const segments = route.segments || [];
          const steps = segments.flatMap((seg) =>
            (seg.steps || []).map((step) => ({
              instruction: step.instruction,
              distance: Math.round(step.distance),
              duration: Math.round(step.duration / 60),
            }))
          );

          return res.json({
            source: 'openrouteservice',
            totalDistance: Math.round((route.summary?.distance || 0) / 1000 * 10) / 10,
            totalDuration: Math.round((route.summary?.duration || 0) / 60),
            waypoints: [
              { label: origin.label || 'Start', lat: origin.lat, lng: origin.lng },
              ...waypoints.map((wp) => ({ label: wp.label || 'Waypoint', lat: wp.lat, lng: wp.lng })),
            ],
            steps,
          });
        }
      } catch (orsErr) {
        console.warn('ORS routing failed, falling back to haversine:', orsErr.message);
      }
    }

    // Haversine fallback — compute straight-line distances
    const allPoints = [origin, ...waypoints];
    let totalDistance = 0;
    const legs = [];

    for (let i = 0; i < allPoints.length - 1; i++) {
      const a = allPoints[i];
      const b = allPoints[i + 1];
      const dist = haversineDistance(a.lat, a.lng, b.lat, b.lng);
      totalDistance += dist;
      legs.push({
        from: a.label || `Point ${i + 1}`,
        to: b.label || `Point ${i + 2}`,
        distance: Math.round(dist * 10) / 10,
        estimatedDuration: Math.round((dist / 40) * 60), // assume 40 km/h avg
      });
    }

    return res.json({
      source: 'haversine_fallback',
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration: Math.round((totalDistance / 40) * 60),
      waypoints: allPoints.map((p) => ({ label: p.label || 'Point', lat: p.lat, lng: p.lng })),
      legs,
      note: 'Straight-line distances. Add ORS_API_KEY in server/.env for turn-by-turn routing.',
    });
  } catch (error) {
    console.error('Routing error:', error);
    return res.status(500).json({ message: 'Failed to compute route.' });
  }
});

/**
 * POST /api/routing/nearest-volunteers
 * Body: { taskLat, taskLng, volunteersWithCoords: [{id, name, lat, lng}] }
 * Returns volunteers sorted by proximity
 */
router.post('/nearest-volunteers', protect, requireRole('coordinator'), (req, res) => {
  try {
    const { taskLat, taskLng, volunteers = [] } = req.body;

    if (taskLat == null || taskLng == null) {
      return res.status(400).json({ message: 'Task coordinates are required.' });
    }

    const ranked = volunteers
      .filter((v) => v.lat != null && v.lng != null)
      .map((v) => ({
        ...v,
        distanceKm: Math.round(haversineDistance(taskLat, taskLng, v.lat, v.lng) * 10) / 10,
        estimatedMinutes: Math.round((haversineDistance(taskLat, taskLng, v.lat, v.lng) / 40) * 60),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ ranked });
  } catch (error) {
    console.error('Nearest volunteers error:', error);
    return res.status(500).json({ message: 'Failed to rank volunteers by proximity.' });
  }
});

module.exports = router;
