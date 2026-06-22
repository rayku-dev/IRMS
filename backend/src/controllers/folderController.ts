import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { z } from 'zod';
import { logAuditAction } from '../services/auditService.js';

const CreateFolderSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sectionId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
});

export const getFolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const sectionId = req.query.sectionId as string;
    const parentId = req.query.parentId as string | undefined;

    if (!sectionId) {
      res.status(400).json({ message: 'sectionId is required' });
      return;
    }

    const where: any = { sectionId };
    
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    const folders = await prisma.folder.findMany({
      where,
      orderBy: { order: 'asc' }
    });

    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = CreateFolderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid input', errors: parsed.error.format() });
      return;
    }

    const { name, description, sectionId, parentId } = parsed.data;

    const maxOrder = await prisma.folder.aggregate({
      where: { sectionId, parentId: parentId || null },
      _max: { order: true }
    });

    const folder = await prisma.folder.create({
      data: {
        name,
        description,
        sectionId,
        parentId: parentId || null,
        order: (maxOrder._max.order || 0) + 1
      }
    });

    await logAuditAction(req, 'add', 'Created folder', folder.id, `Created folder "${folder.name}"`);

    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFolderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        children: { orderBy: { order: 'asc' } },
        files: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!folder) {
      res.status(404).json({ message: 'Folder not found' });
      return;
    }

    res.json(folder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPublicFolderInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        children: { orderBy: { order: 'asc' }, select: { id: true, name: true, description: true } },
        files: { 
          orderBy: { createdAt: 'desc' },
          select: { id: true, filename: true, path: true, mimetype: true, size: true, createdAt: true, metadata: true }
        }
      }
    });

    if (!folder) {
      res.status(404).json({ message: 'Folder not found' });
      return;
    }

    res.json(folder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (req.user?.role !== 'admin') {
      const request = await prisma.approvalRequest.create({
        data: {
          actionType: 'EDIT_FOLDER',
          entityType: 'Folder',
          entityId: id,
          payload: { name, description },
          requesterId: req.user!.id
        }
      });
      res.status(202).json({ pending: true, message: 'Folder edit submitted for admin approval', request });
      return;
    }

    const folder = await prisma.folder.update({
      where: { id },
      data: { name, description }
    });

    await logAuditAction(req, 'edit', 'Updated folder', folder.id, `Updated folder "${folder.name}"`);

    res.json(folder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // First find the folder
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      res.status(404).json({ message: 'Folder not found' });
      return;
    }

    if (req.user?.role !== 'admin') {
      const request = await prisma.approvalRequest.create({
        data: {
          actionType: 'DELETE_FOLDER',
          entityType: 'Folder',
          entityId: id,
          payload: {},
          requesterId: req.user!.id
        }
      });
      res.status(202).json({ pending: true, message: 'Folder deletion submitted for admin approval', request });
      return;
    }

    // Delete associated files
    await prisma.file.deleteMany({ where: { folderId: id } });
    
    // Delete the folder itself
    await prisma.folder.delete({ where: { id } });

    await logAuditAction(req, 'delete', 'Deleted folder', id, `Deleted folder "${folder.name}"`);

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
