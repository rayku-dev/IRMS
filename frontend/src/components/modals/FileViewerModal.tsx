import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { type FileData, getFileBlob, downloadFile, getPublicLink } from '../../services/fileService';
import { toast } from 'sonner';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileData | null;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({ isOpen, onClose, file }) => {
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [officeUrl, setOfficeUrl] = useState<string | null>(null);

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
        const blob = await getFileBlob(file.id, file.mimeType);
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (error: any) {
        toast.error('Failed to load file preview');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadFile();
    } else {
      setBlobUrl(null);
      setOfficeUrl(null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, isOpen]);

  const handleDownload = () => {
    if (file) {
      downloadFile(file.id, file.originalName).catch(() => toast.error('Failed to download file'));
    }
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
          <DialogTitle className="text-xl">{file?.originalName}</DialogTitle>
          <div className="flex items-center gap-2 pr-6">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 rounded-md overflow-hidden relative">
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
              <Button onClick={handleDownload}>Download File</Button>
            </div>
          ) : isOffice && officeUrl ? (
            <div className="w-full h-full relative">
              <iframe 
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(officeUrl)}&embedded=true`} 
                title={file?.originalName} 
                className="w-full h-full border-0" 
              />
            </div>
          ) : blobUrl ? (
            isImage ? (
              <img 
                src={blobUrl} 
                alt={file?.originalName} 
                className="max-w-full max-h-full object-contain" 
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
      </DialogContent>
    </Dialog>
  );
};

export default FileViewerModal;
