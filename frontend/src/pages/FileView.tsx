import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Download, Loader2, History, Upload as UploadIcon, FileText, MessageSquare, Users, Send, ArrowLeft } from 'lucide-react';
import { type FileVersionData, downloadFile, getPublicFileInfo, getFileVersions, uploadFileVersion, getComments } from '../services/fileService';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

const FileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [versions, setVersions] = useState<FileVersionData[]>([]);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  
  // Collaboration State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeViewers, setActiveViewers] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let newSocket: Socket | null = null;
    
    const loadFileAndHistory = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // We can reuse getPublicFileInfo here since it returns the file details and the public URL
        const data = await getPublicFileInfo(id);
        setFile(data);

        // Fetch versions
        const history = await getFileVersions(id);
        setVersions(history);
        
        // Fetch comments
        const fileComments = await getComments(id);
        setComments(fileComments);
      } catch (err) {
        console.error(err);
        setError('Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    if (id && user) {
      loadFileAndHistory();

      // Initialize Socket
      newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000');
      setSocket(newSocket);

      newSocket.emit('join-document', { fileId: id, username: user.username });

      newSocket.on('user-joined', (data) => {
        setActiveViewers((prev) => Array.from(new Set([...prev, data.username])));
        toast(`${data.username} started viewing this document`);
      });

      newSocket.on('user-left', (data) => {
        setActiveViewers((prev) => prev.filter(u => u !== data.username));
      });

      newSocket.on('new-comment', (data) => {
        setComments((prev) => [...prev, data]);
      });
    }

    return () => {
      if (newSocket && id && user) {
        newSocket.emit('leave-document', { fileId: id, username: user.username });
        newSocket.disconnect();
      }
    };
  }, [id, user]);

  const handleDownload = () => {
    if (file) {
      downloadFile(file.id, file.originalName).catch(() => toast.error('Failed to download file'));
    }
  };

  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !file) return;
    
    setIsUploadingVersion(true);
    try {
      const newFile = e.target.files[0];
      await uploadFileVersion(file.id, newFile);
      toast.success('New version uploaded successfully');
      
      // Refresh versions
      const history = await getFileVersions(file.id);
      setVersions(history);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload new version');
    } finally {
      setIsUploadingVersion(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !socket || !file || !user) return;
    
    socket.emit('send-comment', {
      fileId: file.id,
      userId: user.id,
      username: user.username,
      content: newComment
    });
    
    setNewComment('');
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">{error || 'File not found'}</h1>
        <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Go Back</Button>
      </div>
    );
  }

  const isImage = file.mimeType?.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  const isOffice = file.mimeType?.includes('ms-excel') || 
                   file.mimeType?.includes('spreadsheetml') ||
                   file.mimeType?.includes('msword') || 
                   file.mimeType?.includes('wordprocessingml') ||
                   file.mimeType?.includes('ms-powerpoint') || 
                   file.mimeType?.includes('presentationml') ||
                   file.originalName?.toLowerCase().match(/\.(xls|xlsx|doc|docx|ppt|pptx)$/);

  const canPreview = isImage || isPdf || isOffice;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center gap-4 border-b bg-card px-6 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="font-semibold text-base leading-tight">
              {file.metadata?.title || file.originalName} {file.version ? `(v${file.version})` : ''}
            </h1>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB • Uploaded by {file.uploadedBy}
            </span>
          </div>
        </div>
        <Button onClick={handleDownload} size="sm" variant="secondary">
          <Download className="h-4 w-4 mr-2" /> Download
        </Button>
      </header>

      {/* Main Layout: Preview (Left) + Sidebar (Right) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Preview Area */}
        <main className="flex-1 bg-muted/10 relative p-4 flex flex-col items-center justify-center border-r">
          {!canPreview ? (
            <div className="text-center p-8 bg-card border rounded-xl shadow-sm">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                This file type ({file.mimeType || 'unknown'}) cannot be previewed directly in the browser.
              </p>
              <Button onClick={handleDownload} size="lg">Download File</Button>
            </div>
          ) : isOffice ? (
            <iframe 
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`} 
              title={file.originalName} 
              className="w-full h-full border rounded bg-white shadow-sm" 
            />
          ) : isImage ? (
            <img 
              src={file.url} 
              alt={file.originalName} 
              className="max-w-full max-h-full object-contain p-4 bg-white rounded shadow-sm" 
            />
          ) : isPdf ? (
            <iframe 
              src={`${file.url}#toolbar=0`} 
              title={file.originalName} 
              className="w-full h-full border rounded bg-white shadow-sm" 
            />
          ) : null}
        </main>

        {/* Right Sidebar (Discussion & History) */}
        <aside className="w-96 flex flex-col bg-card shrink-0 h-full">
          <Tabs defaultValue="discussion" className="flex flex-col h-full">
            <TabsList className="w-full justify-start rounded-none h-12 p-0 bg-transparent border-b">
              <TabsTrigger value="discussion" className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Discussion
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                History
              </TabsTrigger>
            </TabsList>

            {/* Discussion Tab */}
            <TabsContent value="discussion" className="flex-1 mt-0 flex flex-col h-full overflow-hidden data-[state=inactive]:hidden">
              <div className="bg-muted/30 border-b p-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  Live Viewers
                </div>
                <div className="flex -space-x-2">
                  {activeViewers.map((viewer, idx) => (
                    <div key={idx} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs border-2 border-background" title={viewer}>
                      {viewer.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {activeViewers.length === 0 && (
                    <span className="text-xs text-muted-foreground mr-2">Only you</span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                {comments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No comments yet. Start the discussion!</p>
                  </div>
                ) : (
                  comments.map((comment, idx) => (
                    <div key={comment.id || idx} className={`flex flex-col ${comment.username === user?.username ? 'items-end' : 'items-start'}`}>
                      <div className="text-[10px] text-muted-foreground mb-1 mx-1">
                        {comment.username} • {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${comment.username === user?.username ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                        {comment.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-3 bg-background border-t shrink-0">
                <form onSubmit={handleSendComment} className="flex gap-2">
                  <Input 
                    placeholder="Type a comment..." 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 text-sm h-9"
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!newComment.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 mt-0 overflow-y-auto p-4 data-[state=inactive]:hidden bg-muted/5">
              <div className="mb-6 flex flex-col gap-3">
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleUploadNewVersion}
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploadingVersion} className="w-full gap-2" variant="outline">
                  {isUploadingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
                  Upload New Version
                </Button>
              </div>

              <div className="space-y-3">
                {/* Current Active Version */}
                <div className="border rounded-lg p-3 bg-primary/5 relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm text-primary">
                        Version {file?.version || 1} (Current)
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        By {file?.uploadedBy || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file?.createdAt ? new Date(file.createdAt).toLocaleDateString() : ''} • {(file?.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Historical Versions */}
                {versions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No previous versions exist.</p>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="border rounded-lg p-3 flex items-start gap-3 bg-card shadow-sm">
                      <div className="bg-muted p-2 rounded shrink-0">
                        <History className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm">Version {v.versionNumber}</h4>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          By {v.uploadedBy}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.createdAt).toLocaleDateString()} • {(v.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
};

export default FileView;
