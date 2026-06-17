import { api } from '../lib/api';

export interface Section {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  icon: string;
  typeId?: string;
  active?: boolean;
}

export const getAllSections = async (): Promise<Section[]> => {
  const response = await api.get('/sections');
  return response.data;
};

export const createSection = async (sectionData: any): Promise<Section> => {
  const response = await api.post('/sections', sectionData);
  return response.data;
};

export const updateSection = async (id: string, sectionData: any): Promise<Section> => {
  const response = await api.put(`/sections/${id}`, sectionData);
  return response.data;
};

export const getSectionTypes = async () => {
  const response = await api.get('/sections/types');
  return response.data;
};

export const createSectionType = async (typeData: { name: string }) => {
  const response = await api.post('/sections/types', typeData);
  return response.data;
};

export const updateSectionType = async (id: string, typeData: { name: string }) => {
  const response = await api.put(`/sections/types/${id}`, typeData);
  return response.data;
};

export const deleteSectionType = async (id: string): Promise<void> => {
  await api.delete(`/sections/types/${id}`);
};

export const deleteSection = async (id: string): Promise<void> => {
  await api.delete(`/sections/${id}`);
};
