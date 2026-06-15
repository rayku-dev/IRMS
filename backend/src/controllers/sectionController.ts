import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { SectionSchema } from '../schemas/index.js';
import { z } from 'zod';

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

    const updatedSection = await prisma.section.update({
      where: { id },
      data: updateData,
      include: { type: true }
    });

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

    await prisma.file.deleteMany({ where: { sectionId: id } });
    await prisma.folder.deleteMany({ where: { sectionId: id } });
    await prisma.section.delete({ where: { id } });

    res.json({ message: 'Section permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
