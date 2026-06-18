import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { SectionSchema } from '../schemas/index.js';
import { z } from 'zod';
import { logAuditAction } from '../services/auditService.js';

const typeToIcon: Record<string, string> = {
  'storage': 'Database',
  'form': 'FileText',
  'admin': 'Building2',
  'archive': 'Archive'
};

export const getSectionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const section = await prisma.section.findUnique({
      where: { id, active: true },
      include: {
        type: true,
        folders: {
          where: { parentId: null },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!section) {
      res.status(404).json({ message: 'Section not found' });
      return;
    }

    res.json({
      ...section,
      icon: typeToIcon[section.type.name] || 'Folder',
      subfolders: {}
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSectionBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const section = await prisma.section.findFirst({
      where: { slug, active: true },
      include: {
        type: true,
        folders: {
          where: { parentId: null },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!section) {
      res.status(404).json({ message: 'Section not found' });
      return;
    }

    res.json({
      ...section,
      icon: typeToIcon[section.type.name] || 'Folder',
      subfolders: {}
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSectionByName = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const section = await prisma.section.findFirst({
      where: {
        name: { equals: decodeURIComponent(name) },
        active: true
      },
      include: {
        type: true,
        folders: {
          where: { parentId: null },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!section) {
      res.status(404).json({ message: 'Section not found' });
      return;
    }

    res.json({
      ...section,
      icon: typeToIcon[section.type.name] || 'Folder',
      subfolders: {}
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSections = async (req: Request, res: Response): Promise<void> => {
  try {
    const sections = await prisma.section.findMany({
      where: { active: true },
      include: {
        type: true,
        folders: {
          where: { parentId: null },
          orderBy: [{ order: 'asc' }]
        }
      },
      orderBy: [{ order: 'asc' }]
    });

    const response = sections.map(section => ({
      ...section,
      icon: typeToIcon[section.type.name] || 'Folder'
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const CreateSectionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  typeId: z.string().uuid()
});

export const createSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = CreateSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid input', errors: parsed.error.format() });
      return;
    }

    const { name, description, typeId } = parsed.data;

    const existing = await prisma.section.findFirst({
      where: { name, active: true }
    });

    if (existing) {
      res.status(400).json({ message: 'Section with this name already exists' });
      return;
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const maxOrder = await prisma.section.aggregate({ _max: { order: true } });

    const section = await prisma.section.create({
      data: {
        name,
        slug,
        description,
        typeId,
        active: true,
        order: (maxOrder._max.order || 0) + 1
      },
      include: { type: true }
    });

    await logAuditAction(req, 'add', 'Created section', section.id, `Created section "${section.name}"`);

    res.status(201).json({
      ...section,
      icon: typeToIcon[section.type.name] || 'Folder'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const listSectionTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const types = await prisma.sectionType.findMany({ orderBy: { name: 'asc' } });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, typeId } = req.body;

    const existingSection = await prisma.section.findUnique({ where: { id } });
    if (!existingSection) {
      res.status(404).json({ message: 'Section not found' });
      return;
    }

    if (name && name !== existingSection.name) {
      const duplicate = await prisma.section.findFirst({
        where: { name, active: true, id: { not: id } }
      });
      if (duplicate) {
        res.status(400).json({ message: 'Section with this name already exists' });
        return;
      }
    }

    const updateData: any = {};
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (description) updateData.description = description;
    if (typeId) updateData.typeId = typeId;

    if (req.user?.role !== 'admin') {
      const request = await prisma.approvalRequest.create({
        data: {
          actionType: 'EDIT_SECTION',
          entityType: 'Section',
          entityId: id,
          payload: updateData,
          requesterId: req.user!.id
        }
      });
      res.status(202).json({ pending: true, message: 'Section edit submitted for admin approval', request });
      return;
    }

    const updatedSection = await prisma.section.update({
      where: { id },
      data: updateData,
      include: { type: true }
    });

    await logAuditAction(req, 'edit', 'Updated section', updatedSection.id, `Updated section "${updatedSection.name}"`);

    res.json({
      ...updatedSection,
      icon: typeToIcon[updatedSection.type.name] || 'Folder'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) {
      res.status(404).json({ message: 'Section not found' });
      return;
    }

    if (req.user?.role !== 'admin') {
      const request = await prisma.approvalRequest.create({
        data: {
          actionType: 'DELETE_SECTION',
          entityType: 'Section',
          entityId: id,
          payload: {},
          requesterId: req.user!.id
        }
      });
      res.status(202).json({ pending: true, message: 'Section deletion submitted for admin approval', request });
      return;
    }

    await prisma.file.deleteMany({ where: { sectionId: id } });
    await prisma.folder.deleteMany({ where: { sectionId: id } });
    await prisma.section.delete({ where: { id } });

    await logAuditAction(req, 'delete', 'Deleted section', id, `Deleted section "${section.name}"`);

    res.json({ message: 'Section permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createSectionType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ message: 'Name is required' });
      return;
    }

    const existing = await prisma.sectionType.findFirst({
      where: { name }
    });

    if (existing) {
      res.status(400).json({ message: 'Section type with this name already exists' });
      return;
    }

    const type = await prisma.sectionType.create({
      data: { name }
    });

    await logAuditAction(req, 'system', 'Created section type', type.id, `Created section type "${type.name}"`);

    res.status(201).json(type);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSectionType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const existing = await prisma.sectionType.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Section type not found' });
      return;
    }

    if (name && name !== existing.name) {
      const duplicate = await prisma.sectionType.findFirst({
        where: { name, id: { not: id } }
      });
      if (duplicate) {
        res.status(400).json({ message: 'Section type with this name already exists' });
        return;
      }
    }

    const updated = await prisma.sectionType.update({
      where: { id },
      data: { name }
    });

    await logAuditAction(req, 'system', 'Updated section type', updated.id, `Updated section type "${updated.name}"`);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteSectionType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.sectionType.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Section type not found' });
      return;
    }

    const sectionCount = await prisma.section.count({
      where: { typeId: id }
    });

    if (sectionCount > 0) {
      res.status(400).json({ message: 'Cannot delete section type because it is in use by one or more sections.' });
      return;
    }

    await prisma.sectionType.delete({ where: { id } });

    await logAuditAction(req, 'system', 'Deleted section type', id, `Deleted section type "${existing.name}"`);

    res.json({ message: 'Section type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
