import { api } from '../lib/api';

export interface Folder {
  id: string;
  name: string;
  sectionId: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export const getAllFolders = async (sectionId: string, parentId?: string, page = 1, limit = 50) => {
  const params = new URLSearchParams({ sectionId, page: page.toString(), limit: limit.toString() });
  if (parentId) params.append('parentId', parentId);
  const response = await api.get(`/folders?${params.toString()}`);
  return response.data; // { folders, pagination }
};

export const createFolder = async (folderData: { name: string; sectionId: string; parentId?: string }): Promise<Folder> => {
  const response = await api.post('/folders', folderData);
  return response.data;
};

export const renameFolder = async (id: string, name: string): Promise<any> => {
  const response = await api.put(`/folders/${id}`, { name });
  return response.data;
};

export const deleteFolder = async (id: string): Promise<any> => {
  const response = await api.delete(`/folders/${id}`);
  return response.data;
};

export const getPublicFolderInfo = async (id: string): Promise<any> => {
  const response = await api.get(`/folders/info/${id}`);
  return response.data;
};
