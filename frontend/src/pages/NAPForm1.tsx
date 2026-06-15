import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

const NAPForm1: React.FC = () => {
  const handleGenerateTemplate = () => {
    try {
      // Create a mock CSV content for NAP Form 1
      const csvContent = "data:text/csv;charset=utf-8," 
        + "National Archives of the Philippines - Form 1\n"
        + "Agency/Office, Date, Prepared By\n"
        + "Record Series, Description, Retention Period, Remarks\n"
        + ",,,\n";

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "NAP_Form_1_Template.csv");
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);

      toast.success('Template downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate template');
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
              onClick={handleGenerateTemplate}
            >
              <Download className="h-5 w-5" />
              Generate CSV Template
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 w-full sm:w-auto"
              onClick={() => {
                toast.info("Static template currently unavailable in v2. Please use Generate.");
              }}
            >
              <FileSpreadsheet className="h-5 w-5" />
              Download Static Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NAPForm1;
