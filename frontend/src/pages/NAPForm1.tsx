import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '../contexts/AuthContext';
const NAPForm1: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleReplaceTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await api.post('/files/template/nap-form-1', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast.success('Template replaced successfully');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Failed to replace template');
      console.error(error);
    }
  };
  const handleDownloadStatic = async () => {
    try {
      const response = await api.get('/files/template/nap-form-1', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'NAP-Form-No.-1-Template.xls');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Static template downloaded successfully');
    } catch (error) {
      toast.error('Failed to download static template');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto py-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">National Archives of the Philippines - Form 1</h1>
        <p className="text-muted-foreground">Download official templates and forms</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
            NAP Form 1 Template
          </CardTitle>
          <CardDescription>
            Download the official NAP Form 1 template to ensure compliance with the National Archives of the Philippines requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground mb-6">
            This form is used for the Records Disposition Schedule. Fill out the record series, descriptions, and retention periods according to the NAP guidelines.
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              className="gap-2 w-full sm:w-auto"
              onClick={handleDownloadStatic}
            >
              <Download className="h-5 w-5" />
              Download Form 1 Template
            </Button>
            
            {user?.role === 'admin' && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  accept=".xls,.xlsx" 
                  onChange={handleReplaceTemplate} 
                />
                <Button 
                  size="lg" 
                  variant="outline"
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5" />
                  Replace Template
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NAPForm1;
