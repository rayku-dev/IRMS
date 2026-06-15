import { api } from '../lib/api';

export const getStatistics = async () => {
  // Since we don't have a dedicated statistics endpoint in the backend yet,
  // we can derive basic statistics from the sections endpoint for the dashboard
  const sections = await api.get('/sections');
  
  return {
    sections: {
      total: sections.data.length,
      storageRooms: sections.data.filter((s: any) => s.typeId === 'storage' || s.name.toLowerCase().includes('storage')).length,
      activeForms: sections.data.filter((s: any) => s.name.toLowerCase().includes('form')).length,
      adminAreas: sections.data.filter((s: any) => s.name.toLowerCase().includes('admin') || s.name.toLowerCase().includes('office')).length,
    },
    timestamp: new Date().toISOString()
  };
};
