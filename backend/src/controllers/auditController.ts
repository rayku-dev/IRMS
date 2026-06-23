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

export const getDisposals = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'dispose', entity: 'file' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true } } }
    });

    const formattedLogs = logs.map(log => ({
      id: log.id,
      fileId: log.entityId,
      disposedBy: log.user?.username || 'System',
      reason: (log.details as any)?.reason || 'Manual Disposal',
      timestamp: log.createdAt,
      originalRequester: (log.details as any)?.requesterId || 'Unknown'
    }));

    res.json(formattedLogs);
  } catch (error) {
    console.error('Error fetching disposal logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Action Distribution
    const distribution = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        action: true,
      },
    });

    // Recent System Activity Over Time (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    const activityByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      activityByDay[d.toISOString().split('T')[0]] = 0;
    }

    recentLogs.forEach((log) => {
      const dateStr = log.createdAt.toISOString().split('T')[0];
      if (activityByDay[dateStr] !== undefined) {
        activityByDay[dateStr]++;
      }
    });

    const systemActivityOverTime = Object.keys(activityByDay).map((date) => ({
      date,
      actions: activityByDay[date],
    }));

    const actionDistribution = distribution.map((item) => ({
      name: item.action,
      value: item._count.action,
    }));

    res.json({ systemActivityOverTime, actionDistribution });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};
