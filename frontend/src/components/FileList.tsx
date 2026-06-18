import React, { useState, useEffect } from 'react';
import { getFiles, deleteFile, downloadFile, type FileData } from '../services/fileService';
import { useAuth } from '../contexts/AuthContext';
import { useRecentActivity } from '../contexts/RecentActivityContext';
import { Button } from '@/components/ui/button';
import { Trash2, Download, FileText, CornerUpRight, Eye } from 'lucide-react';
import { toast } from 'sonner';
import FileStats from './FileStats';
import MoveFileDialog from './modals/MoveFileDialog';
import FileViewerModal from './modals/FileViewerModal';

interface FileListProps {
  folderId: string;
  sectionId: string;
  onFileCountChange?: (count: number) => void;
}

const FileList: React.FC<FileListProps> = ({ folderId, onFileCountChange }) => {
  const { user } = useAuth();
  const { addActivity } = useRecentActivity();
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [moveFileModalOpen, setMoveFileModalOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<FileData | null>(null);
  
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [fileToView, setFileToView] = useState<FileData | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const data = await getFiles(folderId);
      setFiles(data);
      if (onFileCountChange) onFileCountChange(data.length);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (folderId) fetchFiles();
  }, [folderId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      const result: any = await deleteFile(id);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('File deleted');
        addActivity({
          action: 'Deleted file',
          description: 'A file was deleted',
          type: 'delete',
          user: user?.username
        });
        fetchFiles();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete file');
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      await downloadFile(id, name);
    } catch (error: any) {
      toast.error(error.message || 'Failed to download file');
    }
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground">Loading files...</div>;

  return (
    <div className="space-y-6">
      <FileStats files={files} />
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
            <tr>
              <th className="px-6 py-3">File Name</th>
              <th className="px-6 py-3">Size</th>
              <th className="px-6 py-3">Uploaded By</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No files in this folder</td>
              </tr>
            ) : (
              files.map(file => (
                <tr key={file.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {file.originalName}
                  </td>
                  <td className="px-6 py-4">{(file.size / 1024).toFixed(2)} KB</td>
                  <td className="px-6 py-4">
                    {typeof file.uploadedBy === 'object' && file.uploadedBy !== null 
                      ? (file.uploadedBy as any).username 
                      : (file.uploadedBy || 'Unknown')}
                  </td>
                  <td className="px-6 py-4">{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Unknown'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 hover:text-primary" onClick={() => { setFileToView(file); setViewerModalOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(file.id, file.originalName)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-500/10 hover:text-blue-600" onClick={() => { setFileToMove(file); setMoveFileModalOpen(true); }}>
                      <CornerUpRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(file.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
      <MoveFileDialog
        isOpen={moveFileModalOpen}
        onClose={() => setMoveFileModalOpen(false)}
        file={fileToMove}
        onMove={async (fId, newFolderId) => {
          // Implement move logic by calling moveFile from fileService
          const { moveFile } = await import('../services/fileService');
          const result: any = await moveFile(fId, newFolderId);
          if (result?.pending) {
            toast.info(result.message);
          } else {
            toast.success('File moved successfully');
            addActivity({
              action: 'Moved file',
              description: `File "${fileToMove?.originalName || 'unknown'}" was moved`,
              type: 'edit',
              user: user?.username
            });
            fetchFiles();
          }
        }}
      />
      
      <FileViewerModal 
        isOpen={viewerModalOpen}
        onClose={() => {
          setViewerModalOpen(false);
          // Small timeout to allow animation to complete before clearing file
          setTimeout(() => setFileToView(null), 300);
        }}
        file={fileToView}
      />
    </div>
  );
};

export default FileList;
