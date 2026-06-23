import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRecentActivity } from '../contexts/RecentActivityContext';
import { getAllFolders, createFolder, deleteFolder, renameFolder, type Folder as FolderType } from '../services/folderService';
import { getFiles, deleteFile, downloadFile, type FileData } from '../services/fileService';
import { api } from '../lib/api';
import { 
  FolderOpen, Folder as FolderIcon, Archive, Database, Warehouse, Building2, FileText, Calendar, 
  Plus, Trash2, Edit, Upload as UploadIcon, Grid as GridIcon, List as ListIcon, MoreVertical, File as FileIcon, Download, CornerUpRight, Eye, Share, Info, ArrowUp, ArrowDown, ListOrdered
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import DriveBreadcrumbs from '../components/DriveBreadcrumbs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import FileUpload from '../components/FileUpload';
import MoveFileDialog from '../components/modals/MoveFileDialog';
import FileInfoModal from '../components/modals/FileInfoModal';
import { format } from 'date-fns';

const getFolderIcon = (folderName: string) => {
  const name = folderName.toLowerCase();
  if (name.includes('archive') || name.includes('old')) return Archive;
  if (name.includes('data')) return Database;
  if (name.includes('storage') || name.includes('warehouse')) return Warehouse;
  if (name.includes('office') || name.includes('building')) return Building2;
  if (name.includes('document') || name.includes('file')) return FileText;
  if (name.match(/\d{4}/) || name.includes('year')) return Calendar;
  return FolderIcon;
};

const systemSectionSlugs = ['records-storage-room', 'ipes-storage-room', 'archive', 'nap-form-1', 'nap-form-3', 'nap-form-7', 'sdoic-offices'];

const FolderView: React.FC = () => {
  const { section, subfolder, subsubfolder } = useParams<{ section: string; subfolder?: string; subsubfolder?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addActivity } = useRecentActivity();
  
  const [sectionData, setSectionData] = useState<any>(null);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'uploader' | 'date' | 'size', direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [draggedFile, setDraggedFile] = useState<File | null>(null);

  const [moveFileModalOpen, setMoveFileModalOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<FileData | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [fileForInfo, setFileForInfo] = useState<FileData | null>(null);
  const fileUploadRef = useRef<any>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && sectionData) {
      setDraggedFile(acceptedFiles[0]);
    }
  }, [sectionData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true
  });

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

  const fetchContentData = useCallback(async (sectionId: string, parentId?: string) => {
    setLoading(true);
    try {
      const foldersData = await getAllFolders(sectionId, parentId || 'null', 1, 100);
      setFolders(foldersData.folders || foldersData);

      if (parentId) {
        const filesData = await getFiles(parentId);
        setFiles(filesData);
      } else {
        const filesData = await getFiles(undefined, sectionId);
        setFiles(filesData);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error fetching content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const sId = await fetchSectionData();
      if (!sId) return;

      if (!subfolder) {
        setCurrentFolderId(null);
        await fetchContentData(sId);
      } else {
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
        await fetchContentData(sId, parentId || undefined);
      }
    };
    init();
  }, [section, subfolder, subsubfolder, fetchSectionData, fetchContentData]);

  const handleAddFolder = async () => {
    const name = window.prompt('Enter new folder name:');
    if (!name || !sectionData) return;
    try {
      await createFolder({ name, sectionId: sectionData.id, parentId: currentFolderId || undefined });
      toast.success(`Folder "${name}" created`);
      addActivity({ action: 'Added folder', description: `Folder "${name}" was created`, type: 'add', user: user?.username });
      fetchContentData(sectionData.id, currentFolderId || undefined);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create folder');
    }
  };

  const handleRenameFolder = async (id: string, oldName: string) => {
    const newName = window.prompt('Enter new folder name:', oldName);
    if (!newName || newName === oldName) return;
    try {
      const result: any = await renameFolder(id, newName);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('Folder renamed');
        addActivity({ action: 'Renamed folder', description: `Folder renamed to "${newName}"`, type: 'edit', user: user?.username });
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this folder?')) return;
    try {
      const result: any = await deleteFolder(id);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('Folder deleted');
        addActivity({ action: 'Deleted folder', description: 'A folder was deleted', type: 'delete', user: user?.username });
        setFolders(prev => prev.filter(f => f.id !== id));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete folder');
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      const result: any = await deleteFile(id);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('File deleted');
        addActivity({ action: 'Deleted file', description: 'A file was deleted', type: 'delete', user: user?.username });
        setFiles(prev => prev.filter(f => f.id !== id));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete file');
    }
  };

  const handleDownloadFile = async (id: string, name: string) => {
    try {
      await downloadFile(id, name);
    } catch (error: any) {
      toast.error(error.message || 'Failed to download file');
    }
  };

  const handleRenameFile = async (file: FileData) => {
    const oldName = file.metadata?.title || file.originalName;
    const newName = window.prompt('Enter new file name:', oldName);
    if (!newName || newName === oldName) return;
    try {
      const newMetadata = { ...(file.metadata || {}), title: newName };
      const { updateFileMetadata } = await import('../services/fileService');
      const result: any = await updateFileMetadata(file.id, newMetadata);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('File renamed');
        addActivity({ action: 'Renamed file', description: `File renamed to "${newName}"`, type: 'edit', user: user?.username });
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, metadata: newMetadata } : f));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to rename file');
    }
  };

  const handleShareFile = async (file: FileData) => {
    try {
      const url = `${window.location.origin}/share/f/${file.id}`;
      await navigator.clipboard.writeText(url);
      toast.success('Public share link copied to clipboard!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate share link');
    }
  };

  const handleShareFolder = async (folderId: string) => {
    try {
      const url = `${window.location.origin}/share/d/${folderId}`;
      await navigator.clipboard.writeText(url);
      toast.success('Public folder share link copied to clipboard!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate share link');
    }
  };

  const handleFolderClick = (folderName: string) => {
    navigate(`/folder/${[section, subfolder, subsubfolder, folderName].filter(Boolean).join('/')}`);
  };

  if (loading) {
    return <div className="p-12 flex justify-center text-muted-foreground animate-pulse">Loading drive...</div>;
  }

  const isCustomSection = sectionData && !systemSectionSlugs.includes(sectionData.slug);
  const canAddFolder = (!subfolder && isCustomSection) || (subfolder && user?.role === 'admin');

  const pathSegments = [subfolder, subsubfolder].filter(Boolean) as string[];

  const handleSort = (key: 'name' | 'uploader' | 'date' | 'size') => {
    if (sortConfig.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 inline-block ml-1" /> : <ArrowDown className="h-4 w-4 inline-block ml-1" />;
  };

  const sortedFolders = [...folders].sort((a, b) => {
    let aValue, bValue;
    switch (sortConfig.key) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'date':
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedFiles = [...files].sort((a, b) => {
    let aValue, bValue;
    switch (sortConfig.key) {
      case 'name':
        aValue = (a.metadata?.title || a.originalName).toLowerCase();
        bValue = (b.metadata?.title || b.originalName).toLowerCase();
        break;
      case 'uploader':
        aValue = (typeof a.uploadedBy === 'object' && a.uploadedBy !== null ? (a.uploadedBy as any).username : (a.uploadedBy || '')).toLowerCase();
        bValue = (typeof b.uploadedBy === 'object' && b.uploadedBy !== null ? (b.uploadedBy as any).username : (b.uploadedBy || '')).toLowerCase();
        break;
      case 'date':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'size':
        aValue = a.size;
        bValue = b.size;
        break;
      default:
        aValue = (a.metadata?.title || a.originalName).toLowerCase();
        bValue = (b.metadata?.title || b.originalName).toLowerCase();
    }
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div {...getRootProps()} className={`space-y-6 animate-in fade-in duration-500 min-h-[500px] rounded-xl transition-all ${isDragActive ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''}`}>
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl border-2 border-primary border-dashed m-4">
          <div className="text-center">
            <UploadIcon className="h-16 w-16 text-primary mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-primary">Drop file here to upload</h2>
            <p className="text-muted-foreground mt-2">The file will be uploaded to {pathSegments[pathSegments.length - 1] || sectionData?.name}</p>
          </div>
        </div>
      )}
      
      {/* Drive Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex-1 min-w-0">
          <DriveBreadcrumbs 
            sectionSlug={sectionData?.slug || section || ''} 
            sectionName={sectionData?.name || 'Section'} 
            pathSegments={pathSegments} 
          />
          <h1 className="text-3xl font-bold truncate">{pathSegments[pathSegments.length - 1] || sectionData?.name}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-muted p-1 rounded-lg flex items-center mr-2">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <GridIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" /> New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canAddFolder && (
                <DropdownMenuItem onClick={handleAddFolder} className="cursor-pointer gap-2 py-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span>New folder</span>
                </DropdownMenuItem>
              )}
              {canAddFolder && <DropdownMenuSeparator />}
              {(currentFolderId || canAddFolder) && (
                <DropdownMenuItem 
                  onSelect={(e) => e.preventDefault()} 
                  onClick={() => fileUploadRef.current?.open()} 
                  className="cursor-pointer gap-2 py-2"
                >
                  <UploadIcon className="h-4 w-4 text-muted-foreground" />
                  <span>File upload</span>
                </DropdownMenuItem>
              )}
              {!canAddFolder && !currentFolderId && (
                <DropdownMenuItem disabled>
                  No actions available
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content Area */}
      {folders.length === 0 && files.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-xl border-dashed">
          <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
          <h3 className="text-xl font-medium">This folder is empty</h3>
          <p className="text-muted-foreground mt-2 mb-6">Create a folder or drop files here to get started.</p>
          <div className="flex items-center justify-center gap-3">
            {canAddFolder && (
              <Button onClick={handleAddFolder} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> New Folder
              </Button>
            )}
            {(currentFolderId || canAddFolder) && (
              <Button onClick={() => fileUploadRef.current?.open()} variant="default" className="gap-2">
                <UploadIcon className="h-4 w-4" /> Upload File
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="space-y-8">
              {/* Folders Grid */}
              {folders.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-4 px-1">Folders</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sortedFolders.map(folder => {
                      const Icon = getFolderIcon(folder.name);
                      return (
                        <div 
                          key={folder.id} 
                          className="group bg-card hover:bg-accent/50 border rounded-xl p-3 cursor-pointer transition-all hover:shadow-sm flex items-center gap-3"
                          onDoubleClick={() => handleFolderClick(folder.name)}
                        >
                          <Icon className="h-6 w-6 text-primary shrink-0" />
                          <span className="font-medium text-sm truncate flex-1 select-none">{folder.name}</span>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleFolderClick(folder.name)}>
                                <FolderOpen className="h-4 w-4 mr-2" /> Open
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('Download folder coming soon')}>
                                <Download className="h-4 w-4 mr-2" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRenameFolder(folder.id, folder.name)}>
                                <Edit className="h-4 w-4 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toast.info('Share folder coming soon')}>
                                <Share className="h-4 w-4 mr-2" /> Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('Organize folder coming soon')}>
                                <CornerUpRight className="h-4 w-4 mr-2" /> Organize
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('Folder info coming soon')}>
                                <Info className="h-4 w-4 mr-2" /> Folder information
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteFolder(folder.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Move to trash
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files Grid */}
              {files.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-4 px-1">Files</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sortedFiles.map(file => (
                      <div 
                        key={file.id} 
                        className="group bg-card hover:bg-accent/50 border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-sm flex flex-col h-[180px]"
                        onDoubleClick={() => navigate(`/file/${file.id}`)}
                      >
                        {/* File Preview Area */}
                        <div className="flex-1 bg-muted/30 flex items-center justify-center p-4 border-b">
                          <FileIcon className="h-16 w-16 text-muted-foreground/40 group-hover:scale-105 transition-transform" />
                        </div>
                        {/* File Footer */}
                        <div className="p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate select-none" title={file.metadata?.title || file.originalName}>
                              {file.metadata?.title || file.originalName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/file/${file.id}`)}>
                                <Eye className="h-4 w-4 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadFile(file.id, file.originalName)}>
                                <Download className="h-4 w-4 mr-2" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRenameFile(file)}>
                                <Edit className="h-4 w-4 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleShareFile(file)}>
                                <Share className="h-4 w-4 mr-2" /> Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setFileToMove(file); setMoveFileModalOpen(true); }}>
                                <CornerUpRight className="h-4 w-4 mr-2" /> Organize
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setFileForInfo(file); setInfoModalOpen(true); }}>
                                <Info className="h-4 w-4 mr-2" /> File information
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteFile(file.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Move to trash
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                    <tr>
                      <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('name')}>
                        Name <SortIcon columnKey="name" />
                      </th>
                      <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('uploader')}>
                        Uploader <SortIcon columnKey="uploader" />
                      </th>
                      <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('date')}>
                        Date modified <SortIcon columnKey="date" />
                      </th>
                      <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('size')}>
                        File size <SortIcon columnKey="size" />
                      </th>
                      <th className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-2">
                              <ListOrdered className="h-4 w-4" /> Sort
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSort('name')}>
                              Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSort('date')}>
                              Date modified {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSort('size')}>
                              File size {sortConfig.key === 'size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Folders List */}
                    {sortedFolders.map(folder => {
                      const Icon = getFolderIcon(folder.name);
                      return (
                        <tr key={folder.id} className="group border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onDoubleClick={() => handleFolderClick(folder.name)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-primary" />
                              <span className="font-medium select-none">{folder.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">-</td>
                          <td className="px-6 py-4 text-muted-foreground">{folder.updatedAt ? format(new Date(folder.updatedAt), 'MMM d, yyyy') : '-'}</td>
                          <td className="px-6 py-4 text-muted-foreground">-</td>
                          <td className="px-6 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleFolderClick(folder.name)}>
                                  <FolderOpen className="h-4 w-4 mr-2" /> Open
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast.info('Download folder coming soon')}>
                                  <Download className="h-4 w-4 mr-2" /> Download
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRenameFolder(folder.id, folder.name)}>
                                  <Edit className="h-4 w-4 mr-2" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleShareFolder(folder.id)}>
                                  <Share className="h-4 w-4 mr-2" /> Share
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast.info('Organize folder coming soon')}>
                                  <CornerUpRight className="h-4 w-4 mr-2" /> Organize
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast.info('Folder info coming soon')}>
                                  <Info className="h-4 w-4 mr-2" /> Information
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteFolder(folder.id)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" /> Move to trash
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Files List */}
                    {sortedFiles.map(file => (
                      <tr key={file.id} className="group border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onDoubleClick={() => navigate(`/file/${file.id}`)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileIcon className="h-5 w-5 text-blue-500" />
                            <div>
                              <span className="font-medium select-none block" title={file.originalName}>
                                {file.metadata?.title || file.originalName}
                              </span>
                              {(file.metadata?.category || file.metadata?.tags?.length > 0) && (
                                <div className="flex items-center gap-1 mt-1">
                                  {file.metadata?.category && (
                                    <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-medium">
                                      {file.metadata.category}
                                    </span>
                                  )}
                                  {file.metadata?.tags?.map((tag: string, idx: number) => (
                                    <span key={idx} className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-muted h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold">
                              {(typeof file.uploadedBy === 'object' && file.uploadedBy !== null ? (file.uploadedBy as any).username : (file.uploadedBy || 'U'))[0]?.toUpperCase()}
                            </div>
                            <span className="text-muted-foreground">
                              {typeof file.uploadedBy === 'object' && file.uploadedBy !== null ? (file.uploadedBy as any).username : (file.uploadedBy || 'Unknown')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {file.createdAt ? format(new Date(file.createdAt), 'MMM d, yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="px-6 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/file/${file.id}`)}>
                                <Eye className="h-4 w-4 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadFile(file.id, file.originalName)}>
                                <Download className="h-4 w-4 mr-2" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRenameFile(file)}>
                                <Edit className="h-4 w-4 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleShareFile(file)}>
                                <Share className="h-4 w-4 mr-2" /> Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setFileToMove(file); setMoveFileModalOpen(true); }}>
                                <CornerUpRight className="h-4 w-4 mr-2" /> Organize
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setFileForInfo(file); setInfoModalOpen(true); }}>
                                <Info className="h-4 w-4 mr-2" /> File information
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteFile(file.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Move to trash
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <MoveFileDialog
        isOpen={moveFileModalOpen}
        onClose={() => setMoveFileModalOpen(false)}
        file={fileToMove}
        onMove={async (fId, newFolderId) => {
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
            fetchContentData(sectionData!.id, currentFolderId || undefined);
          }
        }}
      />
      
      <FileInfoModal
        isOpen={infoModalOpen}
        onClose={() => {
          setInfoModalOpen(false);
          setFileForInfo(null);
        }}
        file={fileForInfo}
      />

      {sectionData && (
        <FileUpload
          ref={fileUploadRef}
          folderId={currentFolderId}
          sectionId={!currentFolderId ? sectionData.id : undefined}
          draggedFile={draggedFile}
          onUploadSuccess={() => {
            setDraggedFile(null);
            fetchContentData(sectionData.id, currentFolderId || undefined);
          }}
        >
          <div className="hidden" />
        </FileUpload>
      )}
    </div>
  );
};

export default FolderView;
