import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicFileInfo } from '../services/fileService';
import { Loader2, Download, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SharedFileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFile = async () => {
      try {
        if (!id) return;
        const data = await getPublicFileInfo(id);
        setFile(data);
      } catch (err) {
        setError('File not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    fetchFile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <h1 className="text-2xl font-bold text-destructive">{error || 'Error loading file'}</h1>
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.url;
    link.setAttribute('download', file.originalName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-muted/40 px-6 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <FileIcon className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">{file.metadata?.title || file.originalName}</h1>
          <span className="text-sm text-muted-foreground ml-4 hidden sm:inline-block">
            {(file.size / 1024).toFixed(2)} KB • Uploaded by {file.uploadedBy}
          </span>
        </div>
        <Button onClick={handleDownload} size="sm">
          <Download className="h-4 w-4 mr-2" /> Download
        </Button>
      </header>
      <main className="flex-1 overflow-hidden flex items-center justify-center bg-muted/10 relative p-4">
        {isOffice ? (
          <iframe 
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`} 
            title={file.originalName} 
            className="w-full h-full border rounded shadow-sm bg-white" 
          />
        ) : isImage ? (
          <img 
            src={file.url} 
            alt={file.originalName} 
            className="max-w-full max-h-full object-contain shadow-sm rounded bg-white" 
          />
        ) : isPdf ? (
          <iframe 
            src={`${file.url}#toolbar=0`} 
            title={file.originalName} 
            className="w-full h-full border rounded shadow-sm bg-white" 
          />
        ) : (
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
        )}
      </main>
    </div>
  );
};

export default SharedFileView;
