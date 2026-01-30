import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './api/routes.js';
import clockifyAddonRoutes from './api/clockifyAddon.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for iframe embedding in Clockify
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'https://app.clockify.me',
  'https://clockify.me',
  'http://localhost:3000',
];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    timestamp: new Date().toISOString(),
  },
});

app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));

// Serve static files (UI)
app.use(express.static('public'));

// API routes
app.use('/api', routes);
app.use('/api/clockify', clockifyAddonRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Clockify Task Bot',
    version: '1.0.0',
    description: 'AI-powered task classification for Clockify',
    endpoints: {
      'POST /api/classify': 'Classify task from description',
      'POST /api/classify-and-log': 'Classify and optionally create time entry',
      'GET /api/knowledge-base': 'Get current knowledge base',
      'POST /api/knowledge-base/refresh': 'Refresh knowledge base cache',
      'POST /api/time-entry': 'Create time entry in Clockify',
      'GET /api/health': 'Health check',
    },
  });
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║           🤖 Clockify Task Bot Started               ║
╠═══════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}            ║
║  Environment: ${process.env.NODE_ENV || 'development'}                        ║
║                                                       ║
║  Endpoints:                                           ║
║  - POST /api/classify      - Classify task            ║
║  - POST /api/time-entry    - Create time entry        ║
║  - GET  /api/health        - Health check             ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
