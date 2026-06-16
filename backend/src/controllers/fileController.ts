import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { bucket } from '../utils/firebase.js';

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

    // Generate unique filename for Firebase
    const firebaseFilename = `${Date.now()}-${req.file.originalname}`;
    const fileUpload = bucket.file(firebaseFilename);

    // Upload the buffer to Firebase Storage
    await fileUpload.save(req.file.buffer, {
      contentType: req.file.mimetype,
      metadata: {
        metadata: {
          originalName: req.file.originalname,
        }
      }
    });

    // Save metadata to database
    const file = await prisma.file.create({
      data: {
        filename: req.file.originalname,
        title: title || req.file.originalname,
        path: firebaseFilename, 
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
    console.error('Upload error:', error);
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

    const mappedFiles = files.map(f => ({
      id: f.id,
      originalName: f.filename,
      fileName: f.path,
      mimeType: f.mimetype,
      size: f.size,
      folderId: f.folderId || '',
      uploadedBy: f.uploadedBy?.username || 'Unknown',
      createdAt: f.createdAt,
    }));

    res.json(mappedFiles);
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

    // Delete from Firebase
    try {
      await bucket.file(file.path).delete();
    } catch (err: any) {
      if (err.code !== 404) {
        console.error('Firebase delete error:', err);
      }
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

    // Generate signed URL
    const [url] = await bucket.file(file.path).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      responseDisposition: `attachment; filename="${file.filename}"`
    });

    res.redirect(url);
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

export const getPublicLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const file = await prisma.file.findUnique({ where: { id } });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // Generate signed URL for public preview without attachment disposition
    const [url] = await bucket.file(file.path).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const downloadPublicFile = async (req: Request, res: Response): Promise<void> => {
  // Deprecated now that getPublicLink directly returns Firebase URL
  res.status(404).json({ message: 'Deprecated endpoint. Use getPublicLink.' });
};
