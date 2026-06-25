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
  metadata?: any;
  version?: number;
}

export interface FileVersionData {
  id: string;
  versionNumber: number;
  path: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

export const getFiles = async (folderId?: string, sectionId?: string, isArchived?: boolean, isDisposed?: boolean) => {
  let url = '/files?';
  if (folderId) {
    url += `folderId=${folderId}&`;
  } else if (sectionId) {
    url += `folderId=null&sectionId=${sectionId}&`;
  }
  if (isArchived !== undefined) url += `isArchived=${isArchived}&`;
  if (isDisposed !== undefined) url += `isDisposed=${isDisposed}&`;
  const response = await api.get(url);
  return response.data;
};

export const uploadFile = async (folderId: string | null, file: File, metadata?: any, retentionDate?: string, sectionId?: string): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);
  if (sectionId) formData.append('sectionId', sectionId);
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }
  if (retentionDate) {
    formData.append('retentionDate', retentionDate);
  }

  const response = await api.post('/files/upload', formData);
  return response.data;
};

export const uploadFileVersion = async (id: string, file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(`/files/${id}/versions`, formData);
  return response.data;
};

export const getFileVersions = async (id: string): Promise<any[]> => {
  const response = await api.get(`/files/${id}/versions`);
  return response.data;
};

export const getComments = async (id: string): Promise<any[]> => {
  const response = await api.get(`/files/${id}/comments`);
  return response.data;
};

export const deleteFile = async (id: string): Promise<void> => {
  await api.delete(`/files/${id}`);
};

export const moveFile = async (id: string, newFolderId: string): Promise<any> => {
  const response = await api.put(`/files/${id}/move`, { newFolderId });
  return response.data;
};

export const updateFileMetadata = async (id: string, metadata: any): Promise<any> => {
  const response = await api.put(`/files/${id}/metadata`, { metadata });
  return response.data;
};

export const downloadFile = async (id: string, originalName: string) => {
  // Get the pure public URL without the ?download parameter
  const response = await api.get(`/files/${id}/public-link`);
  const publicUrl = response.data.url;
  
  // Fetch the actual file binary data
  const fileResponse = await fetch(publicUrl);
  const blob = await fileResponse.blob();
  
  // Create a local blob URL and trigger download
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', originalName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};



export const getPublicLink = async (id: string): Promise<string> => {
  const response = await api.get(`/files/${id}/public-link`);
  return response.data.url;
};

export const getPublicFileInfo = async (id: string): Promise<any> => {
  const response = await api.get(`/files/info/${id}`);
  return response.data;
};

export const queueArchiveFile = async (id: string): Promise<any> => {
  const response = await api.post(`/files/${id}/queue-archive`);
  return response.data;
};

export const queueDisposeFile = async (id: string): Promise<any> => {
  const response = await api.post(`/files/${id}/queue-disposal`);
  return response.data;
};

export const permanentlyDisposeFile = async (id: string): Promise<any> => {
  const response = await api.delete(`/files/${id}/permanently-dispose`);
  return response.data;
};
