import { getAuthHeaders } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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
  const response = await fetch(`${API_URL}/approvals/pending`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch pending approvals');
  }

  return response.json();
};

export const approveRequest = async (id: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/approvals/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to approve request');
  }

  return response.json();
};

export const rejectRequest = async (id: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/approvals/${id}/reject`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to reject request');
  }

  return response.json();
};
