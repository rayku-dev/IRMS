import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { supabase } from '../utils/supabase.js';

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

    // Generate unique filename for Supabase (sanitize name)
    const sanitizedOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const supabaseFilename = `${Date.now()}-${sanitizedOriginalName}`;

    // Upload the buffer to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('irms-files')
      .upload(supabaseFilename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Save metadata to database
    const file = await prisma.file.create({
      data: {
        filename: req.file.originalname,
        title: title || req.file.originalname,
        path: supabaseFilename, 
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

    // Delete from Supabase
    try {
      const { error } = await supabase.storage.from('irms-files').remove([file.path]);
      if (error) throw error;
    } catch (err: any) {
      console.error('Supabase delete error:', err);
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

    // Generate public download URL
    const { data } = supabase.storage.from('irms-files').getPublicUrl(file.path, {
      download: file.filename,
    });

    res.redirect(data.publicUrl);
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

    // Generate public URL for preview
    const { data } = supabase.storage.from('irms-files').getPublicUrl(file.path);

    res.json({ url: data.publicUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const downloadPublicFile = async (req: Request, res: Response): Promise<void> => {
  // Deprecated now that getPublicLink directly returns Firebase URL
  res.status(404).json({ message: 'Deprecated endpoint. Use getPublicLink.' });
};
