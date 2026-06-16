import { api } from '../lib/api';

export interface AuditLogData {
  id?: string;
  action: string;
  description: string;
  type: 'add' | 'edit' | 'delete' | 'system';
  user?: string;
  timestamp?: Date;
}

export const getAuditLogs = async (): Promise<AuditLogData[]> => {
  const response = await api.get('/audit');
  return response.data;
};

export const createAuditLog = async (data: AuditLogData): Promise<AuditLogData> => {
  const response = await api.post('/audit', data);
  return response.data;
};
