import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { supabase } from '../utils/supabase.js';
import path from 'path';
import fs from 'fs/promises';
import { logAuditAction } from '../services/auditService.js';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const { title, sectionId, folderId, folderPath, currentFolder, isArchived, metadata, retentionDate } = req.body;
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

    const payload = {
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
      isArchived: isArchived === 'true' || false,
      metadata: metadata ? JSON.parse(metadata) : null,
      retentionDate: retentionDate ? new Date(retentionDate) : null
    };

    if (req.user?.role !== 'admin') {
      const request = await prisma.approvalRequest.create({
        data: {
          actionType: 'CREATE_FILE',
          entityType: 'File',
          payload,
          requesterId: userId
        }
      });
      res.status(202).json({ pending: true, message: 'File upload submitted for admin approval', request });
      return;
    }

    // Save metadata to database
    const file = await prisma.file.create({
      data: payload
    });

    await logAuditAction(req, 'add', 'Uploaded file', file.id, `Uploaded file "${file.filename}"`);

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
      metadata: f.metadata,
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

    if (req.user?.role !== 'admin') {
      const request = await prisma.approvalRequest.create({
        data: {
          actionType: 'DELETE_FILE',
          entityType: 'File',
          entityId: id,
          payload: { path: file.path }, // Need path to delete from Supabase later
          requesterId: req.user!.id
        }
      });
      res.status(202).json({ pending: true, message: 'File deletion submitted for admin approval', request });
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

    await logAuditAction(req, 'delete', 'Deleted file', file.id, `Deleted file "${file.filename}"`);

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

    res.json({ url: data.publicUrl });
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

    if (req.user?.role !== 'admin') {
      const request = await prisma.approvalRequest.create({
        data: {
          actionType: 'MOVE_FILE',
          entityType: 'File',
          entityId: id,
          payload: { folderId: newFolderId },
          requesterId: req.user!.id
        }
      });
      res.status(202).json({ pending: true, message: 'File move submitted for admin approval', request });
      return;
    }

    const updatedFile = await prisma.file.update({
      where: { id },
      data: { folderId: newFolderId }
    });
    
    await logAuditAction(req, 'edit', 'Moved file', updatedFile.id, `Moved file "${updatedFile.filename}"`);

    res.json(updatedFile);
  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ message: 'Move failed' });
  }
};

export const updateFileMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { metadata } = req.body;

    // Currently allowing standard users to update metadata without approval 
    // to match quick tagging workflows, but this can be routed to approval if needed.
    
    const updatedFile = await prisma.file.update({
      where: { id },
      data: { metadata }
    });

    await logAuditAction(req, 'edit', 'Updated file metadata', updatedFile.id, `Updated metadata for "${updatedFile.filename}"`);

    res.json(updatedFile);
  } catch (error) {
    console.error('Update metadata error:', error);
    res.status(500).json({ message: 'Update metadata failed' });
  }
};

export const uploadFileVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // Upload new version to Supabase
    const sanitizedOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const supabaseFilename = `${Date.now()}-${sanitizedOriginalName}`;

    const { error: uploadError } = await supabase.storage
      .from('irms-files')
      .upload(supabaseFilename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Wrap in a transaction:
    // 1. Create FileVersion with old file details
    // 2. Update File with new details
    const result = await prisma.$transaction(async (tx) => {
      await tx.fileVersion.create({
        data: {
          fileId: file.id,
          versionNumber: file.version,
          path: file.path,
          size: file.size,
          userId: file.userId, // The original uploader of that specific version
        }
      });

      return await tx.file.update({
        where: { id: file.id },
        data: {
          path: supabaseFilename,
          mimetype: req.file.mimetype,
          size: req.file.size,
          version: file.version + 1,
          filename: req.file.originalname,
          userId: userId // The user who uploaded the new version
        }
      });
    });

    await logAuditAction(req, 'edit', 'Uploaded new version', result.id, `Uploaded v${result.version} for "${result.filename}"`);

    res.status(201).json(result);
  } catch (error) {
    console.error('Upload version error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFileVersions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const versions = await prisma.fileVersion.findMany({
      where: { fileId: id },
      include: {
        uploadedBy: { select: { username: true } }
      },
      orderBy: { versionNumber: 'desc' }
    });

    // We also map the current active version as the top-most one? 
    // Usually the active one is in the File model. We can just return the historical ones.
    const mappedVersions = versions.map(v => ({
      id: v.id,
      versionNumber: v.versionNumber,
      path: v.path,
      size: v.size,
      uploadedBy: v.uploadedBy?.username || 'Unknown',
      createdAt: v.createdAt
    }));

    res.json(mappedVersions);
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPublicFileInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { username: true } },
      }
    });

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // Generate public URL for preview
    const { data } = supabase.storage.from('irms-files').getPublicUrl(file.path);

    res.json({
      id: file.id,
      originalName: file.filename,
      fileName: file.path,
      mimeType: file.mimetype,
      size: file.size,
      folderId: file.folderId || '',
      uploadedBy: file.uploadedBy?.username || 'Unknown',
      createdAt: file.createdAt,
      metadata: file.metadata,
      url: data.publicUrl
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
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

export const downloadTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    
    let filename = '';
    if (name === 'nap-form-1') {
      filename = 'NAP-Form-No.-1-Template.xls';
    } else {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    // Since the project is run with ts-node or compiled to dist, it's safer to resolve from process.cwd() or __dirname
    const filePath = path.resolve(process.cwd(), 'src', 'template', filename);
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Template download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error downloading template' });
        }
      }
    });
  } catch (error) {
    console.error('Server error during template download:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const uploadTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    
    // Note: check role if you have it in user object, otherwise assume authorize middleware handles it
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    let filename = '';
    if (name === 'nap-form-1') {
      filename = 'NAP-Form-No.-1-Template.xls';
    } else {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    const filePath = path.resolve(process.cwd(), 'src', 'template', filename);
    await fs.writeFile(filePath, req.file.buffer);

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Upload template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const comments = await prisma.comment.findMany({
      where: { fileId: id },
      include: {
        user: { select: { username: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    const mapped = comments.map(c => ({
      id: c.id,
      content: c.content,
      username: c.user?.username || 'Unknown',
      createdAt: c.createdAt
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
