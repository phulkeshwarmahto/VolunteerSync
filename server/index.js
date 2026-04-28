const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const server = http.createServer(app);

const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: '*',
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: configuredOrigins.length ? configuredOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/match', require('./routes/match'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/forecast', require('./routes/forecast'));
app.use('/api/crisis', require('./routes/crisis'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/beneficiaries', require('./routes/beneficiaries'));

require('./socket/socketHandler')(io);

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: error.message || 'Internal server error.',
  });
});

async function startServer() {
  try {
    await connectDB();
    const port = Number(process.env.PORT) || 5000;
    server.listen(port, () => {
      console.log(`VolunteerSync API running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
