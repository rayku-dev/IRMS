import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import fs from 'fs';
import path from 'path';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const { title, sectionId, folderId, folderPath, currentFolder, isArchived } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const file = await prisma.file.create({
      data: {
        filename: req.file.originalname,
        title: title || req.file.originalname,
        path: req.file.filename, // Saved as hashed name
        mimetype: req.file.mimetype,
        size: req.file.size,
        userId,
        sectionId: sectionId || null,
        folderId: folderId || null,
        folderPath: folderPath || null,
        currentFolder: currentFolder || null,
        isArchived: isArchived === 'true' || false
      }
    });

    res.status(201).json(file);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId, folderId, isArchived } = req.query;
    
    const query: any = {};
    if (sectionId) query.sectionId = String(sectionId);
    if (folderId) query.folderId = String(folderId);
    if (isArchived !== undefined) query.isArchived = isArchived === 'true';

    const files = await prisma.file.findMany({
      where: query,
      include: {
        uploadedBy: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(files);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const file = await prisma.file.findUnique({ where: { id } });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // Delete from disk
    const filePath = path.join(process.cwd(), 'uploads', file.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from db
    await prisma.file.delete({ where: { id } });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const file = await prisma.file.findUnique({ where: { id } });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    const filePath = path.join(process.cwd(), 'uploads', file.path);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'File not found on disk' });
      return;
    }

    res.download(filePath, file.filename);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const moveFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newFolderId } = req.body;
    
    if (!newFolderId) {
      res.status(400).json({ message: 'New folder ID is required' });
      return;
    }

    const updatedFile = await prisma.file.update({
      where: { id },
      data: { folderId: newFolderId }
    });
    
    res.json(updatedFile);
  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ message: 'Move failed' });
  }
};
