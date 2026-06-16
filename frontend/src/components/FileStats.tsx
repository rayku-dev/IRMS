import React from 'react';
import { type FileData } from '../services/fileService';
import { FileText, Image, Archive, File } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FileStatsProps {
  files: FileData[];
}

const FileStats: React.FC<FileStatsProps> = ({ files }) => {
  if (files.length === 0) return null;

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const formattedTotalSize = (totalSize / 1024 / 1024).toFixed(2); // MB

  const getTypeStats = () => {
    const stats: Record<string, { count: number; size: number }> = {
      images: { count: 0, size: 0 },
      documents: { count: 0, size: 0 },
      archives: { count: 0, size: 0 },
      others: { count: 0, size: 0 },
    };

    files.forEach((file) => {
      const mime = (file.mimeType || (file as any).mimetype || '').toLowerCase();
      if (mime.includes('image/')) {
        stats.images.count++;
        stats.images.size += file.size;
      } else if (mime.includes('pdf') || mime.includes('document') || mime.includes('word') || mime.includes('excel')) {
        stats.documents.count++;
        stats.documents.size += file.size;
      } else if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) {
        stats.archives.count++;
        stats.archives.size += file.size;
      } else {
        stats.others.count++;
        stats.others.size += file.size;
      }
    });

    return stats;
  };

  const stats = getTypeStats();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full text-primary">
            <File className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Files</p>
            <p className="text-2xl font-bold">{files.length}</p>
            <p className="text-xs text-muted-foreground">{formattedTotalSize} MB</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-blue-500/10 p-3 rounded-full text-blue-500">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Documents</p>
            <p className="text-xl font-bold">{stats.documents.count}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-500">
            <Image className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Images</p>
            <p className="text-xl font-bold">{stats.images.count}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-orange-500/10 p-3 rounded-full text-orange-500">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Archives</p>
            <p className="text-xl font-bold">{stats.archives.count}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileStats;
