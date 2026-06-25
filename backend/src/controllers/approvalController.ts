import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

const recursivelyUpdateFolderState = async (tx: any, folderId: string, data: any) => {
  await tx.folder.update({ where: { id: folderId }, data });
  await tx.file.updateMany({ where: { folderId }, data });
  const children = await tx.folder.findMany({ where: { parentId: folderId }, select: { id: true } });
  for (const child of children) {
    await recursivelyUpdateFolderState(tx, child.id, data);
  }
};

// Get all pending approvals (Admin only)
export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const approvals = await prisma.approvalRequest.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        requestedBy: {
          select: { id: true, username: true, role: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(approvals);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Approve a request
export const approveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const request = await prisma.approvalRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    const payload = request.payload as any;

    // Execute the action based on actionType
    // We run it inside a transaction if possible, or just sequentially
    await prisma.$transaction(async (tx) => {
      // 1. Mark request as approved
      await tx.approvalRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: adminId
        }
      });

      // 2. Execute the action
      switch (request.actionType) {
        case 'CREATE_FILE':
          await tx.file.create({
            data: payload
          });
          break;
        case 'DELETE_FILE':
          if (!request.entityId) throw new Error('Missing file ID');
          // Handle Supabase file removal after transaction commits
          const fileToDelete = await tx.file.findUnique({ where: { id: request.entityId } });
          if (fileToDelete) {
            postCommitTasks.push(async () => {
              const { supabase } = await import('../utils/supabase.js');
              await supabase.storage.from('irms-files').remove([fileToDelete.path]);
            });
          }
          await tx.file.delete({ where: { id: request.entityId } });
          await tx.auditLog.create({
            data: {
              userId: adminId,
              action: 'delete',
              entity: 'file',
              entityId: request.entityId,
              details: { approvedBy: adminId, requesterId: request.requesterId },
            },
          });
          break;

        case 'ARCHIVE_FILE':
          if (!request.entityId) throw new Error('Missing file ID');
          await tx.file.update({
            where: { id: request.entityId },
            data: { isArchived: true }
          });
          await tx.auditLog.create({
            data: {
              userId: adminId,
              action: 'archive',
              entity: 'file',
              entityId: request.entityId,
              details: { reason: 'NAP Schedule met', approvedBy: adminId, requesterId: request.requesterId },
            },
          });
          break;

        case 'DISPOSE_FILE':
          if (!request.entityId) throw new Error('Missing file ID');
          await tx.file.update({
            where: { id: request.entityId },
            data: { isDisposed: true }
          });
          await tx.auditLog.create({
            data: {
              userId: adminId,
              action: 'dispose_queue',
              entity: 'file',
              entityId: request.entityId,
              details: { reason: 'For Disposal', approvedBy: adminId, requesterId: request.requesterId },
            },
          });
          break;

        case 'ARCHIVE_FOLDER':
          if (!request.entityId) throw new Error('Missing folder ID');
          await recursivelyUpdateFolderState(tx, request.entityId, { isArchived: true });
          await tx.auditLog.create({
            data: {
              userId: adminId,
              action: 'archive',
              entity: 'folder',
              entityId: request.entityId,
              details: { approvedBy: adminId, requesterId: request.requesterId },
            },
          });
          break;

        case 'DISPOSE_FOLDER':
          if (!request.entityId) throw new Error('Missing folder ID');
          await recursivelyUpdateFolderState(tx, request.entityId, { isDisposed: true });
          await tx.auditLog.create({
            data: {
              userId: adminId,
              action: 'dispose_queue',
              entity: 'folder',
              entityId: request.entityId,
              details: { approvedBy: adminId, requesterId: request.requesterId },
            },
          });
          break;

        case 'EDIT_SECTION':
          await tx.section.update({
            where: { id: request.entityId! },
            data: payload
          });
          break;
        case 'DELETE_SECTION':
          await tx.section.delete({
            where: { id: request.entityId! }
          });
          break;
        case 'EDIT_FOLDER':
          await tx.folder.update({
            where: { id: request.entityId! },
            data: payload
          });
          break;
        case 'DELETE_FOLDER':
          await tx.folder.delete({
            where: { id: request.entityId! }
          });
          break;
        case 'MOVE_FILE':
          await tx.file.update({
            where: { id: request.entityId! },
            data: payload
          });
          break;
        default:
          throw new Error(`Unknown actionType: ${request.actionType}`);
      }

      // Log the audit action
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: `APPROVED_${request.actionType}`,
          entity: request.entityType,
          entityId: request.entityId || payload.id || null,
          details: { originalRequestId: request.id, requestedBy: request.requesterId }
        }
      });
    });

    // Post-transaction tasks (like deleting from Supabase)
    if (request.actionType === 'DELETE_FILE' && payload.path) {
      const { supabase } = await import('../utils/supabase.js');
      try {
        await supabase.storage.from('irms-files').remove([payload.path]);
      } catch (err) {
        console.error('Failed to delete file from Supabase during approval:', err);
      }
    }

    res.json({ message: 'Request approved successfully' });
  } catch (error: any) {
    console.error('Error approving request:', error);
    res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
};

// Reject a request
export const rejectRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const request = await prisma.approvalRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    // Mark as rejected
    await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approverId: adminId
      }
    });

    // NOTE: If the action was CREATE_FILE, the file is sitting in Supabase storage unlinked.
    // In a full production app, you might want to call supabase storage delete here
    // to clean up the abandoned file. We'll leave it for now or implement if requested.

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: `REJECTED_${request.actionType}`,
        entity: request.entityType,
        entityId: request.entityId || null,
        details: { originalRequestId: request.id, requestedBy: request.requesterId }
      }
    });

    res.json({ message: 'Request rejected' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
