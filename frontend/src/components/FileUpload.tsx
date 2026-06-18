import React, { useRef, useState } from 'react';
import { uploadFile } from '../services/fileService';
import { useAuth } from '../contexts/AuthContext';
import { useRecentActivity } from '../contexts/RecentActivityContext';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  folderId: string;
  onUploadSuccess: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ folderId, onUploadSuccess }) => {
  const { user } = useAuth();
  const { addActivity } = useRecentActivity();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      const result: any = await uploadFile(folderId, file);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('File uploaded successfully');
        addActivity({
          action: 'Uploaded file',
          description: `File "${file.name}" was uploaded`,
          type: 'add',
          user: user?.username
        });
        onUploadSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
      <Button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isUploading}
        className="flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        {isUploading ? 'Uploading...' : 'Upload File'}
      </Button>
    </div>
  );
};

export default FileUpload;
