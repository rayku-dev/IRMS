import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Archive as ArchiveIcon, RefreshCw, Trash2, Download, Folder as FolderIcon, File as FileIcon, FolderOpen, Eye, X } from 'lucide-react';
import { getAllFolders, queueDisposeFolder } from '../services/folderService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const AdminArchive: React.FC = () => {
  const { user } = useAuth();
  const [archivedFiles, setArchivedFiles] = useState<any[]>([]);
  const [archivedFolders, setArchivedFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Folder contents modal
  const [viewFolderOpen, setViewFolderOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [folderFiles, setFolderFiles] = useState<any[]>([]);
  const [loadingFolderFiles, setLoadingFolderFiles] = useState(false);

  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const fetchArchived = async () => {
    try {
      setLoading(true);
      const [filesRes, foldersData] = await Promise.all([
        api.get('/files?isArchived=true'),
        getAllFolders(undefined, undefined, 1, 1000, true, false)
      ]);
      setArchivedFiles(filesRes.data || []);
      setArchivedFolders(foldersData.folders || foldersData || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load archived files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const initiateDisposal = async (id: string, isFolder: boolean) => {
    if (!window.confirm(`Are you sure you want to queue this ${isFolder ? 'folder' : 'file'} for permanent disposal?`)) return;
    try {
      setProcessingId(id);
      if (isFolder) {
        await queueDisposeFolder(id);
      } else {
        await api.post(`/files/${id}/queue-disposal`);
      }
      toast.success(`${isFolder ? 'Folder' : 'File'} queued for disposal approval`);
      fetchArchived();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || `Failed to queue for disposal`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewFolder = async (folder: any) => {
    setSelectedFolder(folder);
    setViewFolderOpen(true);
    setLoadingFolderFiles(true);
    try {
      const res = await api.get(`/files?folderId=${folder.id}&isArchived=true`);
      setFolderFiles(res.data || []);
    } catch (err) {
      toast.error('Failed to load folder contents');
    } finally {
      setLoadingFolderFiles(false);
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
            {archivedFiles.length + archivedFolders.length} item{archivedFiles.length + archivedFolders.length !== 1 ? 's' : ''} in archive
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
              {loading && archivedFiles.length === 0 && archivedFolders.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    Loading archives...
                  </td>
                </tr>
              ) : archivedFiles.length === 0 && archivedFolders.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    No archived items found.
                  </td>
                </tr>
              ) : (
                <>
                  {archivedFolders.map((folder: any) => (
                    <tr key={folder.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-2">
                        <FolderIcon className="h-4 w-4 text-amber-500" />
                        {folder.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {format(new Date(folder.createdAt), 'MMM d, yyyy')}
                      </td>
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
                            onClick={() => initiateDisposal(folder.id, true)}
                            disabled={processingId === folder.id}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Dispose
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {archivedFiles.map((doc: any) => (
                    <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-blue-500" />
                        {doc.originalName || doc.title || doc.fileName}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
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
                            onClick={() => initiateDisposal(doc.id, false)}
                            disabled={processingId === doc.id}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Dispose
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
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
            <DialogDescription>Archived files inside this folder</DialogDescription>
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
                    <Button size="sm" variant="outline" onClick={() => handleDownload(file.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
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

export default AdminArchive;
