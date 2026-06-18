import { api } from '../lib/api';

export interface ApprovalRequest {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  payload: any;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requesterId: string;
  requestedBy?: {
    id: string;
    username: string;
    role: string;
  };
  approverId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getPendingApprovals = async (): Promise<ApprovalRequest[]> => {
  const response = await api.get('/approvals/pending');
  return response.data;
};

export const approveRequest = async (id: string): Promise<{ message: string }> => {
  const response = await api.post(`/approvals/${id}/approve`);
  return response.data;
};

export const rejectRequest = async (id: string): Promise<{ message: string }> => {
  const response = await api.post(`/approvals/${id}/reject`);
  return response.data;
};
