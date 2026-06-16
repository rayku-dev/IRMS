import { api } from '../lib/api';

export interface FileData {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  folderId: string;
  uploadedBy: string;
  createdAt: string;
}

export const getFiles = async (folderId: string) => {
  const response = await api.get(`/files?folderId=${folderId}`);
  return response.data;
};

export const uploadFile = async (folderId: string, file: File): Promise<FileData> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folderId', folderId);
  
  const response = await api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteFile = async (id: string): Promise<void> => {
  await api.delete(`/files/${id}`);
};

export const moveFile = async (id: string, newFolderId: string): Promise<FileData> => {
  const response = await api.put(`/files/${id}/move`, { newFolderId });
  return response.data;
};

export const downloadFile = async (id: string, originalName: string) => {
  const response = await api.get(`/files/download/${id}`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', originalName);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const getFileBlob = async (id: string, mimeType: string): Promise<Blob> => {
  const response = await api.get(`/files/download/${id}`, { responseType: 'blob' });
  return new Blob([response.data], { type: mimeType });
};

export const getPublicLink = async (id: string): Promise<string> => {
  const response = await api.get(`/files/${id}/public-link`);
  return response.data.url;
};
