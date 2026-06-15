import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { z } from 'zod';

const CreateFolderSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sectionId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
});

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

export const updateFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const folder = await prisma.folder.update({
      where: { id },
      data: { name, description }
    });

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

    // Delete associated files
    await prisma.file.deleteMany({ where: { folderId: id } });
    
    // Delete the folder itself
    await prisma.folder.delete({ where: { id } });

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
