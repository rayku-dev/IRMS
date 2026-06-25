import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Trash2, RefreshCw, FileText, Eye, FolderOpen, Folder as FolderIcon, File as FileIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';

const AdminDisposal: React.FC = () => {
  const { user } = useAuth();
  const [disposalLogs, setDisposalLogs] = useState<any[]>([]);
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  const [pendingFolders, setPendingFolders] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Folder contents modal
  const [viewFolderOpen, setViewFolderOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [folderFiles, setFolderFiles] = useState<any[]>([]);
  const [loadingFolderFiles, setLoadingFolderFiles] = useState(false);

  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const fetchDisposals = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get('/audit/disposals');
      setDisposalLogs(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load disposal records');
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchPendingDisposals = async () => {
    try {
      setLoadingPending(true);
      const [filesRes, foldersData] = await Promise.all([
        api.get('/files?isDisposed=true'),
        api.get('/folders?isDisposed=true')
      ]);
      setPendingFiles(filesRes.data || []);
      setPendingFolders(foldersData.data?.folders || foldersData.data || []);
    } catch (err: any) {
      toast.error('Failed to load pending disposals');
    } finally {
      setLoadingPending(false);
    }
  };

  const handleViewFolder = async (folder: any) => {
    setSelectedFolder(folder);
    setViewFolderOpen(true);
    setLoadingFolderFiles(true);
    try {
      const res = await api.get(`/files?folderId=${folder.id}&isDisposed=true`);
      setFolderFiles(res.data || []);
    } catch (err) {
      toast.error('Failed to load folder contents');
    } finally {
      setLoadingFolderFiles(false);
    }
  };

  const permanentlyDispose = async (id: string, isFolder: boolean) => {
    if (!window.confirm(`Are you sure you want to permanently dispose this ${isFolder ? 'folder' : 'file'}? This action CANNOT be undone.`)) return;
    try {
      setProcessingId(id);
      if (isFolder) {
        await api.delete(`/folders/${id}/permanently-dispose`);
      } else {
        await api.delete(`/files/${id}/permanently-dispose`);
      }
      toast.success(`${isFolder ? 'Folder' : 'File'} permanently disposed`);
      fetchPendingDisposals();
      fetchDisposals(); // refresh logs
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to dispose');
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchDisposals();
    fetchPendingDisposals();
  }, []);

  const generateCertificate = (log: any) => {
    const doc = new jsPDF();
    
    // Certificate Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF DISPOSAL', 105, 40, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Information Records Management System (IRMS)', 105, 50, { align: 'center' });
    
    doc.line(20, 55, 190, 55);
    
    // Content
    doc.setFontSize(12);
    const dateStr = format(new Date(log.timestamp), 'MMMM do, yyyy, h:mm a');
    
    const lines = [
      `This is to certify that the electronic record identified below has been`,
      `permanently disposed and wiped from the storage database in accordance`,
      `with the National Archives of the Philippines (NAP) retention schedules.`,
      ``,
      `RECORD DETAILS:`,
      `Record ID: ${log.fileId || 'N/A'}`,
      `Reason for Disposal: ${log.reason}`,
      `Date of Disposal: ${dateStr}`,
      ``,
      `AUTHORIZATION:`,
      `Disposal Approved & Executed By: ${log.disposedBy}`,
      `Original Requester: ${log.originalRequester}`
    ];
    
    doc.text(lines, 20, 70);
    
    // Signatures
    doc.line(20, 160, 80, 160);
    doc.text('Authorized System Administrator', 20, 167);
    
    // Save PDF
    doc.save(`Certificate_of_Disposal_${log.fileId || 'Record'}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Disposal Management</h1>
          <p className="text-muted-foreground">Manage pending disposals and view historical records</p>
        </div>
        <Button onClick={() => { fetchDisposals(); fetchPendingDisposals(); }} variant="outline" size="icon" disabled={loadingLogs || loadingPending}>
          <RefreshCw className={`h-4 w-4 ${loadingLogs || loadingPending ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" /> Pending Permanent Disposal
          </CardTitle>
          <CardDescription>
            Items queued for permanent deletion. Once deleted, they cannot be recovered.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Item Name</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingPending ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    Loading pending disposals...
                  </td>
                </tr>
              ) : pendingFiles.length === 0 && pendingFolders.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    No items pending disposal.
                  </td>
                </tr>
              ) : (
                <>
                  {pendingFolders.map((folder: any) => (
                    <tr key={folder.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{folder.name}</td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">Folder</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => handleViewFolder(folder)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View Contents
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8"
                            onClick={() => permanentlyDispose(folder.id, true)}
                            disabled={processingId === folder.id}
                          >
                            Permanently Dispose
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingFiles.map((file: any) => (
                    <tr key={file.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{file.originalName || file.filename}</td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">File</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          onClick={() => permanentlyDispose(file.id, false)}
                          disabled={processingId === file.id}
                        >
                          Permanently Dispose
                        </Button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" /> Disposed Records
          </CardTitle>
          <CardDescription>
            {disposalLogs.length} historical disposal record{disposalLogs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Record ID</th>
                <th className="px-6 py-4 font-medium">Date Disposed</th>
                <th className="px-6 py-4 font-medium">Disposed By</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingLogs && disposalLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Loading disposal records...
                  </td>
                </tr>
              ) : disposalLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No disposal records found.
                  </td>
                </tr>
              ) : (
                disposalLogs.map((log: any) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium font-mono text-xs">
                      {log.fileId || 'Unknown ID'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      {log.disposedBy}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {log.reason}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => generateCertificate(log)}
                      >
                        <FileText className="h-4 w-4 mr-1" /> Certificate
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={viewFolderOpen} onOpenChange={setViewFolderOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-amber-500" />
              {selectedFolder?.name} Contents
            </DialogTitle>
            <DialogDescription>Disposed files inside this folder</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {loadingFolderFiles ? (
              <p className="text-center text-muted-foreground py-4">Loading files...</p>
            ) : folderFiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">This folder is empty.</p>
            ) : (
              <div className="space-y-2">
                {folderFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">{file.originalName || file.fileName}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(file.createdAt), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDisposal;
