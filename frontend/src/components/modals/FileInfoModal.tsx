import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { type FileData } from '../../services/fileService';

interface FileInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileData | null;
}

const FileInfoModal: React.FC<FileInfoModalProps> = ({ isOpen, onClose, file }) => {
  if (!file) return null;

  const uploaderName = typeof file.uploadedBy === 'object' && file.uploadedBy !== null 
    ? (file.uploadedBy as any).username 
    : (file.uploadedBy || 'Unknown');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>File Information</DialogTitle>
          <DialogDescription>
            Details and metadata for <strong>{file.metadata?.title || file.originalName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm">
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-muted-foreground font-medium">Name:</span>
            <span className="col-span-2 truncate" title={file.metadata?.title || file.originalName}>{file.metadata?.title || file.originalName}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-muted-foreground font-medium">Original File:</span>
            <span className="col-span-2 truncate" title={file.originalName}>{file.originalName}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-muted-foreground font-medium">Type:</span>
            <span className="col-span-2">{file.mimeType || 'Unknown'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-muted-foreground font-medium">Size:</span>
            <span className="col-span-2">{(file.size / 1024).toFixed(2)} KB</span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-muted-foreground font-medium">Uploader:</span>
            <span className="col-span-2">{uploaderName}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b pb-2">
            <span className="text-muted-foreground font-medium">Created:</span>
            <span className="col-span-2">{file.createdAt ? format(new Date(file.createdAt), 'PPP p') : '-'}</span>
          </div>
          {file.metadata?.category && (
            <div className="grid grid-cols-3 gap-2 border-b pb-2">
              <span className="text-muted-foreground font-medium">Category:</span>
              <span className="col-span-2">{file.metadata.category}</span>
            </div>
          )}
          {file.metadata?.tags && file.metadata.tags.length > 0 && (
            <div className="grid grid-cols-3 gap-2 border-b pb-2">
              <span className="text-muted-foreground font-medium">Tags:</span>
              <span className="col-span-2">{file.metadata.tags.join(', ')}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileInfoModal;
