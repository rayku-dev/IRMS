import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  username: z.string().min(3),
  password: z.string().min(6).optional(),
  role: z.string().default('user'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const RegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const LoginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const SectionTypeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
});

export const SectionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string(),
  active: z.boolean().default(true),
  typeId: z.string().uuid(),
  order: z.number().int().default(0),
});

export const FolderSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sectionId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  order: z.number().int(),
  isArchived: z.boolean().default(false),
  isDisposed: z.boolean().default(false),
});

export const FileSchema = z.object({
  id: z.string().uuid().optional(),
  filename: z.string(),
  title: z.string().nullable().optional(),
  path: z.string(),
  relativePath: z.string().nullable().optional(),
  folderPath: z.string().nullable().optional(),
  currentFolder: z.string().nullable().optional(),
  mimetype: z.string(),
  size: z.number().int(),
  userId: z.string().uuid(),
  sectionId: z.string().uuid().nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
  isArchived: z.boolean().default(false),
  isDisposed: z.boolean().default(false),
  metadata: z.any().nullable().optional(),
});
