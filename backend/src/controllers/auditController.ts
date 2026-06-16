import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { username: true }
        }
      }
    });

    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.entity, // Map Prisma entity back to Frontend action (e.g., "Added folder")
      description: log.details && typeof log.details === 'object' && 'description' in log.details 
        ? (log.details as any).description 
        : '',
      type: log.action, // Map Prisma action back to Frontend type (e.g., "add", "edit")
      user: log.user?.username || 'System',
      timestamp: log.createdAt,
    }));

    res.json(formattedLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error fetching audit logs' });
  }
};

export const createAuditLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, description, type, user: username } = req.body;

    let userId = null;
    if (username) {
      const foundUser = await prisma.user.findUnique({
        where: { username }
      });
      if (foundUser) {
        userId = foundUser.id;
      }
    }

    const newLog = await prisma.auditLog.create({
      data: {
        action: type || 'system', // Store 'add', 'edit', etc. here
        entity: action || 'Unknown Action', // Store "Added folder" here
        details: { description },
        userId: userId,
      },
      include: {
        user: { select: { username: true } }
      }
    });

    res.status(201).json({
      id: newLog.id,
      action: newLog.entity,
      description: newLog.details && typeof newLog.details === 'object' && 'description' in newLog.details 
        ? (newLog.details as any).description 
        : '',
      type: newLog.action,
      user: newLog.user?.username || 'System',
      timestamp: newLog.createdAt,
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ message: 'Server error creating audit log' });
  }
};
