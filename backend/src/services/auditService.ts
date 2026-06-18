import { Request } from 'express';
import prisma from '../utils/prisma.js';

export const logAuditAction = async (
  req: Request | null,
  action: string, // 'add', 'edit', 'delete', 'system'
  entity: string, // e.g. 'Added folder', 'Deleted section'
  entityId: string | null = null,
  description: string = '',
  userId: string | null = null
) => {
  try {
    // Attempt to extract userId from req if not explicitly provided
    const id = userId || (req && (req as any).user?.id) || null;

    // Build details JSON
    const details: any = {
      description,
    };

    if (req) {
      details.ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      details.userAgent = req.headers['user-agent'];
    }

    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        details,
        userId: id
      }
    });
  } catch (error) {
    // We intentionally catch and log so that an audit failure doesn't crash the main process,
    // though in a strict compliance setup, you might want it to throw.
    console.error('Failed to write immutable audit log:', error);
  }
};
