import React, { useRef, useState } from 'react';
import { uploadFile } from '../services/fileService';
import { useAuth } from '../contexts/AuthContext';
import { useRecentActivity } from '../contexts/RecentActivityContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  folderId?: string | null;
  sectionId?: string;
  onUploadSuccess: () => void;
  draggedFile?: File | null;
  children?: React.ReactNode;
}
export interface FileUploadRef {
  open: () => void;
}

const FileUpload = React.forwardRef<FileUploadRef, FileUploadProps>(({ folderId, sectionId, onUploadSuccess, draggedFile, children }, ref) => {
  const { user } = useAuth();
  const { addActivity } = useRecentActivity();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [metadata, setMetadata] = useState({ title: '', category: '', tags: '', retentionDate: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useImperativeHandle(ref, () => ({
    open: () => fileInputRef.current?.click()
  }));

  React.useEffect(() => {
    if (draggedFile) {
      setSelectedFile(draggedFile);
      setMetadata({ title: draggedFile.name, category: '', tags: '', retentionDate: '' });
      setIsModalOpen(true);
    }
  }, [draggedFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setSelectedFile(e.target.files[0]);
    setMetadata({ title: e.target.files[0].name, category: '', tags: '', retentionDate: '' });
    setIsModalOpen(true);
    // Reset the input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    
    // Parse tags into array
    const parsedTags = metadata.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const finalMetadata = {
      title: metadata.title,
      category: metadata.category,
      tags: parsedTags
    };

    try {
      const result: any = await uploadFile(folderId || null, selectedFile, finalMetadata, metadata.retentionDate || undefined, sectionId);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('File uploaded successfully');
        addActivity({
          action: 'Uploaded file',
          description: `File "${selectedFile.name}" was uploaded with tags: ${parsedTags.join(', ')}`,
          type: 'add',
          user: user?.username
        });
        onUploadSuccess();
      }
      setIsModalOpen(false);
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileSelect}
      />
      {children ? (
        React.isValidElement(children) ? React.cloneElement(children as React.ReactElement, {
          onClick: (e: any) => {
            fileInputRef.current?.click();
            if ((children as React.ReactElement).props.onClick) {
              (children as React.ReactElement).props.onClick(e);
            }
          },
          onSelect: (e: any) => {
            e.preventDefault();
            fileInputRef.current?.click();
            if ((children as React.ReactElement).props.onSelect) {
              (children as React.ReactElement).props.onSelect(e);
            }
          }
        }) : children
      ) : (
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload File Details</DialogTitle>
            <DialogDescription>
              Add metadata to your file before uploading to the RMS.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title" 
                value={metadata.title} 
                onChange={(e) => setMetadata({...metadata, title: e.target.value})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input 
                id="category" 
                placeholder="e.g. Invoices, HR, Legal"
                value={metadata.category} 
                onChange={(e) => setMetadata({...metadata, category: e.target.value})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input 
                id="tags" 
                placeholder="e.g. urgent, q3, review"
                value={metadata.tags} 
                onChange={(e) => setMetadata({...metadata, tags: e.target.value})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="retentionDate">Retention Schedule (optional)</Label>
              <Input 
                id="retentionDate" 
                type="date"
                value={metadata.retentionDate} 
                onChange={(e) => setMetadata({...metadata, retentionDate: e.target.value})} 
              />
              <p className="text-xs text-muted-foreground">If set, file will be auto-flagged for archival/disposal on this date per NAP guidelines.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadSubmit} disabled={isUploading || !metadata.title}>
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default FileUpload;
