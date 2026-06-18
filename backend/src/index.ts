import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import authRoutes from './routes/authRoutes.js';

import sectionRoutes from './routes/sectionRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import userRoutes from './routes/userRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import { startRetentionCron } from './jobs/retentionCron.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Set up Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Adjust to specific origin in production
    methods: ['GET', 'POST']
  }
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost, any Vercel preview URL, or a specific FRONTEND_URL from env
    if (
      origin.startsWith('http://localhost') || 
      origin.endsWith('vercel.app') || 
      origin === process.env.FRONTEND_URL
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/approvals', approvalRoutes);

// Start Background Jobs
startRetentionCron();

// WebSocket Events
io.on('connection', (socket) => {
  console.log('[Socket] User connected:', socket.id);

  socket.on('join-document', (data) => {
    const { fileId, username } = data;
    socket.join(`doc-${fileId}`);
    // Broadcast presence
    socket.to(`doc-${fileId}`).emit('user-joined', { username, socketId: socket.id });
    console.log(`[Socket] ${username} joined doc-${fileId}`);
  });

  socket.on('leave-document', (data) => {
    const { fileId, username } = data;
    socket.leave(`doc-${fileId}`);
    socket.to(`doc-${fileId}`).emit('user-left', { username, socketId: socket.id });
  });

  socket.on('send-comment', async (data) => {
    const { fileId, username, userId, content } = data;
    try {
      // Import prisma dynamically or use global prisma if available
      const prisma = (await import('./utils/prisma.js')).default;
      const comment = await prisma.comment.create({
        data: {
          fileId,
          userId,
          content
        },
        include: { user: true }
      });
      // Broadcast comment
      io.to(`doc-${fileId}`).emit('new-comment', {
        id: comment.id,
        content: comment.content,
        username: comment.user.username,
        createdAt: comment.createdAt
      });
    } catch (e) {
      console.error('[Socket] Failed to save comment', e);
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket] User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'production') {
  httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
}

export default app;
