import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicFolderInfo } from '../services/folderService';
import { Loader2, Folder as FolderIcon, FileIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const SharedFolderView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFolder = async () => {
      try {
        if (!id) return;
        const data = await getPublicFolderInfo(id);
        setFolder(data);
      } catch (err) {
        setError('Folder not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    fetchFolder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <h1 className="text-2xl font-bold text-destructive">{error || 'Error loading folder'}</h1>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-muted/40 px-6 shrink-0">
        <FolderIcon className="h-5 w-5 text-primary" />
        <h1 className="font-semibold text-lg">{folder.name}</h1>
        {folder.description && (
          <span className="text-sm text-muted-foreground ml-4 hidden sm:inline-block">
            {folder.description}
          </span>
        )}
      </header>
      
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {folder.children && folder.children.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-4 px-1">Subfolders</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {folder.children.map((child: any) => (
                  <div 
                    key={child.id}
                    onClick={() => navigate(`/share/d/${child.id}`)}
                    className="flex items-center gap-3 p-4 bg-card border rounded-xl hover:bg-accent/50 cursor-pointer transition-colors shadow-sm"
                  >
                    <FolderIcon className="h-6 w-6 text-primary shrink-0" />
                    <span className="font-medium truncate">{child.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {folder.files && folder.files.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-4 px-1">Files</h2>
              <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                      <tr>
                        <th className="px-6 py-4 font-medium">Name</th>
                        <th className="px-6 py-4 font-medium">Date modified</th>
                        <th className="px-6 py-4 font-medium">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {folder.files.map((file: any) => (
                        <tr 
                          key={file.id} 
                          className="group border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/share/f/${file.id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <FileIcon className="h-5 w-5 text-blue-500 shrink-0" />
                              <span className="font-medium truncate" title={file.filename}>
                                {file.metadata?.title || file.filename}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                            {file.createdAt ? format(new Date(file.createdAt), 'MMM d, yyyy') : '-'}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                            {(file.size / 1024).toFixed(1)} KB
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {(!folder.children || folder.children.length === 0) && (!folder.files || folder.files.length === 0) && (
            <div className="text-center py-24 text-muted-foreground">
              <FolderIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">This folder is empty</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default SharedFolderView;
