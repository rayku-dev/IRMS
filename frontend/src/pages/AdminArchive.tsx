import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Archive as ArchiveIcon, RefreshCw, Trash2, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const AdminArchive: React.FC = () => {
  const { user } = useAuth();
  const [archivedFiles, setArchivedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const fetchArchived = async () => {
    try {
      setLoading(true);
      const res = await api.get('/files?isArchived=true');
      setArchivedFiles(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load archived files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const initiateDisposal = async (id: string) => {
    if (!window.confirm('Are you sure you want to queue this file for permanent disposal?')) return;
    try {
      setProcessingId(id);
      await api.post(`/files/${id}/dispose`);
      toast.success('File queued for disposal approval');
      fetchArchived();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to queue for disposal');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await api.get(`/files/download/${id}`);
      if (response.data && response.data.url) {
        window.open(response.data.url, '_blank');
      } else {
        throw new Error('No download URL returned');
      }
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Archive</h1>
          <p className="text-muted-foreground">Read-only storage for expired records</p>
        </div>
        <Button onClick={fetchArchived} variant="outline" size="icon" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArchiveIcon className="h-5 w-5 text-primary" /> Archived Records
          </CardTitle>
          <CardDescription>
            {archivedFiles.length} file{archivedFiles.length !== 1 ? 's' : ''} in archive
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Document Name</th>
                <th className="px-6 py-4 font-medium">Archived Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && archivedFiles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    Loading archives...
                  </td>
                </tr>
              ) : archivedFiles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    No archived files found.
                  </td>
                </tr>
              ) : (
                archivedFiles.map((doc: any) => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      {doc.originalName || doc.title || doc.fileName}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {/* Using createdAt or you might have a specific archivedAt timestamp in metadata */}
                      {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => handleDownload(doc.id)}
                        >
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          onClick={() => initiateDisposal(doc.id)}
                          disabled={processingId === doc.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Dispose
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

export default AdminArchive;
