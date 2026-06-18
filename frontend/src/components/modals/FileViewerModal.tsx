import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, History, Upload as UploadIcon, FileText, MessageSquare, Users, Send } from 'lucide-react';
import { type FileData, type FileVersionData, downloadFile, getPublicLink, getFileVersions, uploadFileVersion, getComments } from '../../services/fileService';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAuth } from '../../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileData | null;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({ isOpen, onClose, file }) => {
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [officeUrl, setOfficeUrl] = useState<string | null>(null);
  const [versions, setVersions] = useState<FileVersionData[]>([]);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  
  // Collaboration State
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeViewers, setActiveViewers] = useState<string[]>([]);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    let url: string | null = null;
    
    const loadFile = async () => {
      if (!file || !isOpen) return;
      
      setLoading(true);
      setOfficeUrl(null);
      setBlobUrl(null);
      
      const isOfficeFile = file.mimeType?.includes('ms-excel') || 
                           file.mimeType?.includes('spreadsheetml') ||
                           file.mimeType?.includes('msword') || 
                           file.mimeType?.includes('wordprocessingml') ||
                           file.mimeType?.includes('ms-powerpoint') || 
                           file.mimeType?.includes('presentationml') ||
                           file.originalName?.toLowerCase().match(/\.(xls|xlsx|doc|docx|ppt|pptx)$/);

      if (isOfficeFile) {
        try {
          const publicUrl = await getPublicLink(file.id);
          setOfficeUrl(publicUrl);
        } catch (error) {
          toast.error('Failed to generate public preview link');
          console.error(error);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const publicUrl = await getPublicLink(file.id);
        setBlobUrl(publicUrl);
      } catch (error: any) {
        toast.error('Failed to load file preview');
        console.error(error);
      } finally {
        setLoading(false);
      }

      // Fetch versions
      try {
        const history = await getFileVersions(file.id);
        setVersions(history);
      } catch (error) {
        console.error('Failed to load versions', error);
      }
      // Fetch comments
      try {
        const fileComments = await getComments(file.id);
        setComments(fileComments);
      } catch (error) {
        console.error('Failed to load comments', error);
      }
    };

    let newSocket: Socket | null = null;

    if (isOpen && file && user) {
      loadFile();

      // Initialize Socket
      newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000');
      setSocket(newSocket);

      newSocket.emit('join-document', { fileId: file.id, username: user.username });

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
    } else {
      setBlobUrl(null);
      setOfficeUrl(null);
      setVersions([]);
      setComments([]);
      setActiveViewers([]);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
      if (newSocket && file && user) {
        newSocket.emit('leave-document', { fileId: file.id, username: user.username });
        newSocket.disconnect();
      }
    };
  }, [file, isOpen]);

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
      
      // Refresh preview if needed (might require a full page reload or callback to parent to refresh the file data)
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

  const isImage = file?.mimeType?.startsWith('image/');
  const isPdf = file?.mimeType === 'application/pdf';
  const isOffice = file?.mimeType?.includes('ms-excel') || 
                   file?.mimeType?.includes('spreadsheetml') ||
                   file?.mimeType?.includes('msword') || 
                   file?.mimeType?.includes('wordprocessingml') ||
                   file?.mimeType?.includes('ms-powerpoint') || 
                   file?.mimeType?.includes('presentationml') ||
                   file?.originalName?.toLowerCase().match(/\.(xls|xlsx|doc|docx|ppt|pptx)$/);
  
  const canPreview = isImage || isPdf || isOffice;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <DialogTitle className="text-xl">{file?.originalName} {file?.version ? `(v${file.version})` : ''}</DialogTitle>
          <div className="flex items-center gap-2 pr-6">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Current
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1 flex flex-col h-full overflow-hidden mt-2">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
            <TabsTrigger value="preview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">
              Preview
            </TabsTrigger>
            <TabsTrigger value="discussion" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">
              Discussion & Collaboration
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">
              Version History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 mt-4 m-0 overflow-hidden relative rounded-md border bg-muted/10">
            <div className="flex-1 flex flex-col items-center justify-center h-full relative">
              {loading ? (
                <div className="flex flex-col items-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                  <p>Loading preview...</p>
                </div>
              ) : !canPreview ? (
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Download className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    This file type ({file?.mimeType || 'unknown'}) cannot be previewed directly in the browser.
                  </p>
                  <Button onClick={handleDownload}>Download Current File</Button>
                </div>
              ) : isOffice && officeUrl ? (
                <div className="w-full h-full relative">
                  <iframe 
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(officeUrl)}`} 
                    title={file?.originalName} 
                    className="w-full h-full border-0" 
                  />
                </div>
              ) : blobUrl ? (
                isImage ? (
                  <img 
                    src={blobUrl} 
                    alt={file?.originalName} 
                    className="max-w-full max-h-full object-contain p-4" 
                  />
                ) : isPdf ? (
                  <iframe 
                    src={`${blobUrl}#toolbar=0`} 
                    title={file?.originalName} 
                    className="w-full h-full border-0" 
                  />
                ) : null
              ) : (
                <div className="text-muted-foreground">Failed to load file</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="discussion" className="flex-1 mt-4 m-0 flex flex-col h-full overflow-hidden border rounded-md">
            <div className="bg-muted/30 border-b p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-primary" />
                Live Viewers
              </div>
              <div className="flex -space-x-2">
                {activeViewers.map((viewer, idx) => (
                  <div key={idx} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs border-2 border-background" title={viewer}>
                    {viewer.charAt(0).toUpperCase()}
                  </div>
                ))}
                {activeViewers.length === 0 && (
                  <span className="text-xs text-muted-foreground mr-2">Only you are viewing</span>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {comments.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No comments yet. Start the discussion!</p>
                </div>
              ) : (
                comments.map((comment, idx) => (
                  <div key={comment.id || idx} className={`flex flex-col ${comment.username === user?.username ? 'items-end' : 'items-start'}`}>
                    <div className="text-xs text-muted-foreground mb-1 mx-1">
                      {comment.username} • {new Date(comment.createdAt).toLocaleTimeString()}
                    </div>
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${comment.username === user?.username ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                      {comment.content}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 bg-background border-t">
              <form onSubmit={handleSendComment} className="flex gap-2">
                <Input 
                  placeholder="Type a comment..." 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 mt-4 m-0 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">Version History</h3>
                <p className="text-sm text-muted-foreground">View and download past versions of this document.</p>
              </div>
              <div>
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleUploadNewVersion}
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploadingVersion} className="gap-2">
                  {isUploadingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
                  Upload New Version
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Current Active Version */}
              <div className="border rounded-lg p-4 bg-primary/5 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex items-start gap-4">
                  <div className="bg-primary/20 p-2 rounded-md">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary flex items-center gap-2">
                      Version {file?.version || 1} (Current)
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Uploaded by {(file?.uploadedBy as any)?.username || file?.uploadedBy || 'Unknown'} on {file?.createdAt ? new Date(file.createdAt).toLocaleDateString() : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Size: {file?.size ? (file.size / 1024).toFixed(2) : 0} KB
                    </p>
                  </div>
                </div>
                <div>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    Download
                  </Button>
                </div>
              </div>

              {/* Historical Versions */}
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No previous versions exist.</p>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div className="flex items-start gap-4">
                      <div className="bg-muted p-2 rounded-md">
                        <History className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium">Version {v.versionNumber}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Uploaded by {v.uploadedBy} on {new Date(v.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Size: {(v.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    {/* Note: Downloading historical versions directly requires a new endpoint to generate public links for fileVersions, or reusing the file download endpoint with version path. For now, this serves as view. */}
                    <div>
                      {/* <Button variant="outline" size="sm" disabled>Download</Button> */}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FileViewerModal;
