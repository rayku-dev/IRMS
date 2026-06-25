import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { z } from 'zod';
import { logAuditAction } from '../services/auditService.js';
import { supabase } from '../utils/supabase.js';

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

    const isArchived = req.query.isArchived === 'true';
    const isDisposed = req.query.isDisposed === 'true';

    if (!sectionId && !isArchived && !isDisposed) {
      res.status(400).json({ message: 'sectionId is required for active folders' });
      return;
    }

    const where: any = { 
      isArchived,
      isDisposed
    };
    
    if (sectionId) where.sectionId = sectionId;
    
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

    // Fetch associated files to get their paths
    const filesToDelete = await prisma.file.findMany({
      where: { folderId: id },
      select: { path: true }
    });

    // Delete from Supabase bucket
    const filePaths = filesToDelete.map(f => f.path);
    if (filePaths.length > 0) {
      const { error } = await supabase.storage.from('irms-files').remove(filePaths);
      if (error) {
        console.error('Failed to delete some files from Supabase during folder deletion:', error);
      }
    }

    // Delete associated files from database
    await prisma.file.deleteMany({ where: { folderId: id } });
    
    // Delete the folder itself
    await prisma.folder.delete({ where: { id } });

    await logAuditAction(req, 'delete', 'Deleted folder', id, `Deleted folder "${folder.name}"`);

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const queueArchiveFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      res.status(404).json({ message: 'Folder not found' });
      return;
    }
    
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const request = await prisma.approvalRequest.create({
      data: {
        actionType: 'ARCHIVE_FOLDER',
        entityType: 'Folder',
        entityId: id,
        payload: { name: folder.name },
        requesterId: req.user.id
      }
    });

    res.status(202).json({ pending: true, message: 'Folder queued for archive approval', request });
  } catch (error: any) {
    console.error('Error queueing folder archive:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const queueDisposeFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      res.status(404).json({ message: 'Folder not found' });
      return;
    }
    
    if (!folder.isArchived) {
      res.status(400).json({ message: 'Only archived folders can be queued for disposal' });
      return;
    }
    
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const request = await prisma.approvalRequest.create({
      data: {
        actionType: 'DISPOSE_FOLDER',
        entityType: 'Folder',
        entityId: id,
        payload: { name: folder.name },
        requesterId: req.user.id
      }
    });

    res.status(202).json({ pending: true, message: 'Folder queued for disposal approval', request });
  } catch (error: any) {
    console.error('Error queueing folder disposal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const recursivelyDeleteFolder = async (tx: any, folderId: string) => {
  // fetch children
  const children = await tx.folder.findMany({ where: { parentId: folderId } });
  for (const child of children) {
    await recursivelyDeleteFolder(tx, child.id);
  }
  
  // delete files inside
  const files = await tx.file.findMany({ where: { folderId } });
  if (files.length > 0) {
    try {
      const { supabase } = await import('../utils/supabase.js');
      await supabase.storage.from('irms-files').remove(files.map((f: any) => f.path));
    } catch (err) {}
    await tx.file.deleteMany({ where: { folderId } });
  }

  // delete folder
  await tx.folder.delete({ where: { id: folderId } });
};

export const permanentlyDisposeFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder || !folder.isDisposed) {
      res.status(404).json({ message: 'Folder not found or not in disposed state' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await recursivelyDeleteFolder(tx, id);
      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'dispose',
          entity: 'folder',
          entityId: id,
          details: { folderId: id, reason: 'Permanent Disposal' },
        },
      });
    });

    res.json({ message: 'Folder permanently disposed' });
  } catch (error) {
    console.error('Dispose folder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
