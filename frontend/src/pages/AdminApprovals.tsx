import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { getPendingApprovals, approveRequest, rejectRequest } from '../services/approvalService';
import type { ApprovalRequest } from '../services/approvalService';
import { toast } from 'sonner';
import { Check, X, Clock, File, Folder, Database, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AdminApprovals: React.FC = () => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const data = await getPendingApprovals();
      setApprovals(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await approveRequest(id);
      toast.success('Request approved successfully');
      fetchApprovals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    
    try {
      setProcessingId(id);
      await rejectRequest(id);
      toast.success('Request rejected');
      fetchApprovals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'File': return <File className="h-5 w-5 text-blue-500" />;
      case 'Folder': return <Folder className="h-5 w-5 text-amber-500" />;
      case 'Section': return <Database className="h-5 w-5 text-emerald-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatAction = (actionType: string) => {
    return actionType.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pending Approvals</h1>
          <p className="text-muted-foreground">Review and approve changes submitted by users</p>
        </div>
        <Button onClick={fetchApprovals} variant="outline" size="icon" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
          <CardDescription>
            {approvals.length} request{approvals.length !== 1 ? 's' : ''} awaiting your review
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Requested By</th>
                <th className="px-6 py-4 font-medium">Details</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && approvals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading requests...
                  </td>
                </tr>
              ) : approvals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No pending requests
                  </td>
                </tr>
              ) : (
                approvals.map((request) => (
                  <tr key={request.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getEntityIcon(request.entityType)}
                        <span className="font-medium">{request.entityType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {formatAction(request.actionType)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{request.requestedBy?.username || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={JSON.stringify(request.payload)}>
                      {request.payload.name || request.payload.title || request.payload.filename || 'See details...'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(request.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminApprovals;
