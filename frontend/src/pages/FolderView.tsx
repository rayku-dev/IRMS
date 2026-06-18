import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRecentActivity } from '../contexts/RecentActivityContext';
import { getAllFolders, createFolder, deleteFolder, renameFolder, type Folder as FolderType } from '../services/folderService';
import { api } from '../lib/api';
import { 
  FolderOpen, Folder, Archive, Database, Warehouse, Building2, FileText, Calendar, 
  ChevronRight, Plus, Trash2, Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FileList from '../components/FileList';
import FileUpload from '../components/FileUpload';

const getFolderIcon = (folderName: string) => {
  const name = folderName.toLowerCase();
  if (name.includes('archive') || name.includes('old')) return Archive;
  if (name.includes('data')) return Database;
  if (name.includes('storage') || name.includes('warehouse')) return Warehouse;
  if (name.includes('office') || name.includes('building')) return Building2;
  if (name.includes('document') || name.includes('file')) return FileText;
  if (name.match(/\d{4}/) || name.includes('year')) return Calendar;
  return Folder;
};

const systemSectionSlugs = ['records-storage-room', 'ipes-storage-room', 'archive', 'nap-form-1', 'nap-form-3', 'nap-form-7', 'sdoic-offices'];

const FolderView: React.FC = () => {
  const { section, subfolder, subsubfolder } = useParams<{ section: string; subfolder?: string; subsubfolder?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addActivity } = useRecentActivity();
  
  const [sectionData, setSectionData] = useState<any>(null);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const fetchSectionData = useCallback(async () => {
    if (!section) return;
    try {
      const res = await api.get(`/sections/by-slug/${section}`);
      setSectionData(res.data);
      return res.data.id;
    } catch (error) {
      toast.error('Section not found');
      navigate('/');
      return null;
    }
  }, [section, navigate]);

  const fetchFoldersData = useCallback(async (sectionId: string, parentId?: string) => {
    setLoading(true);
    try {
      const data = await getAllFolders(sectionId, parentId || 'null', 1, 100);
      setFolders(data.folders || data);
    } catch (error: any) {
      toast.error(error.message || 'Error fetching folders');
    } finally {
      setLoading(false);
    }
  }, []);

  // Main logic to resolve the path
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const sId = await fetchSectionData();
      if (!sId) return;

      if (!subfolder) {
        setCurrentFolderId(null);
        await fetchFoldersData(sId);
      } else {
        // Find the folder ID for the deepest path
        const data = await getAllFolders(sId, undefined, 1, 1000);
        const allF = data.folders || data;
        let parentId: string | null = null;
        const pathSegments = [subfolder, subsubfolder].filter(Boolean) as string[];
        
        for (const segment of pathSegments) {
          const found = allF.find((f: any) => f.name.toLowerCase() === segment.toLowerCase() && (f.parentId === parentId || (!f.parentId && !parentId)));
          if (found) {
            parentId = found.id;
          } else {
            parentId = null;
            break;
          }
        }
        
        setCurrentFolderId(parentId);
        await fetchFoldersData(sId, parentId || undefined);
      }
    };
    init();
  }, [section, subfolder, subsubfolder, fetchSectionData, fetchFoldersData]);

  const handleBack = () => {
    const segments = [section, subfolder, subsubfolder].filter(Boolean);
    if (segments.length > 1) {
      navigate(`/folder/${segments.slice(0, -1).join('/')}`);
    } else {
      navigate('/');
    }
  };

  const handleAddFolder = async () => {
    const name = window.prompt('Enter new folder name:');
    if (!name || !sectionData) return;
    try {
      await createFolder({ name, sectionId: sectionData.id, parentId: currentFolderId || undefined });
      toast.success(`Folder "${name}" created`);
      addActivity({ action: 'Added folder', description: `Folder "${name}" was created`, type: 'add', user: user?.username });
      fetchFoldersData(sectionData.id, currentFolderId || undefined);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create folder');
    }
  };

  const handleRenameFolder = async (id: string, oldName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = window.prompt('Enter new folder name:', oldName);
    if (!newName || newName === oldName) return;
    try {
      const result: any = await renameFolder(id, newName);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('Folder renamed');
        addActivity({ action: 'Renamed folder', description: `Folder renamed to "${newName}"`, type: 'edit', user: user?.username });
        fetchFoldersData(sectionData!.id, currentFolderId || undefined);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this folder?')) return;
    try {
      const result: any = await deleteFolder(id);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('Folder deleted');
        addActivity({ action: 'Deleted folder', description: 'A folder was deleted', type: 'delete', user: user?.username });
        fetchFoldersData(sectionData!.id, currentFolderId || undefined);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete folder');
    }
  };

  if (loading) {
    return <div className="p-12 flex justify-center text-muted-foreground animate-pulse">Loading folder data...</div>;
  }

  const isCustomSection = sectionData && !systemSectionSlugs.includes(sectionData.slug);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-card rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="p-0 hover:bg-transparent -ml-2">
            <ChevronRight className="h-5 w-5 rotate-180 mr-1" />
            Back
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{subsubfolder || subfolder || sectionData?.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{sectionData?.description || 'Manage documents and folders inside this section.'}</p>
          </div>
          {(!subfolder && isCustomSection) || (subfolder && user?.role === 'admin') ? (
            <Button onClick={handleAddFolder} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Folder
            </Button>
          ) : null}
        </div>
      </div>

      {/* Folders Grid */}
      {folders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-foreground/80">Folders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {folders.map(folder => {
              const Icon = getFolderIcon(folder.name);
              return (
                <div 
                  key={folder.id} 
                  className="bg-card hover:bg-muted/30 border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md flex items-center group"
                  onClick={() => navigate(`/folder/${[section, subfolder, subsubfolder, folder.name].filter(Boolean).join('/')}`)}
                >
                  <div className="bg-primary/10 p-2.5 rounded-lg text-primary mr-3 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate text-sm">{folder.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10" onClick={(e) => handleRenameFolder(folder.id, folder.name, e)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => handleDeleteFolder(folder.id, e)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File List Component */}
      {currentFolderId && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground/80">Files in {subsubfolder || subfolder}</h2>
            <FileUpload folderId={currentFolderId} onUploadSuccess={() => fetchFoldersData(sectionData!.id, currentFolderId || undefined)} />
          </div>
          <FileList folderId={currentFolderId} sectionId={sectionData!.id} />
        </div>
      )}

      {!currentFolderId && folders.length === 0 && (
        <div className="text-center py-16 bg-card border rounded-xl border-dashed">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium">This section is empty</h3>
          <p className="text-muted-foreground mt-2 mb-4">Create a folder to start organizing your files.</p>
          <Button onClick={handleAddFolder} variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add your first folder</Button>
        </div>
      )}
    </div>
  );
};

export default FolderView;
