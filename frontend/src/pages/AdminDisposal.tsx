import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Trash2, RefreshCw, FileText, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';

const AdminDisposal: React.FC = () => {
  const { user } = useAuth();
  const [disposalLogs, setDisposalLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const fetchDisposals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit/disposals');
      setDisposalLogs(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load disposal records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisposals();
  }, []);

  const generateCertificate = (log: any) => {
    const doc = new jsPDF();
    
    // Certificate Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF DISPOSAL', 105, 40, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Information Records Management System (IRMS)', 105, 50, { align: 'center' });
    
    doc.line(20, 55, 190, 55);
    
    // Content
    doc.setFontSize(12);
    const dateStr = format(new Date(log.timestamp), 'MMMM do, yyyy, h:mm a');
    
    const lines = [
      `This is to certify that the electronic record identified below has been`,
      `permanently disposed and wiped from the storage database in accordance`,
      `with the National Archives of the Philippines (NAP) retention schedules.`,
      ``,
      `RECORD DETAILS:`,
      `Record ID: ${log.fileId || 'N/A'}`,
      `Reason for Disposal: ${log.reason}`,
      `Date of Disposal: ${dateStr}`,
      ``,
      `AUTHORIZATION:`,
      `Disposal Approved & Executed By: ${log.disposedBy}`,
      `Original Requester: ${log.originalRequester}`
    ];
    
    doc.text(lines, 20, 70);
    
    // Signatures
    doc.line(20, 160, 80, 160);
    doc.text('Authorized System Administrator', 20, 167);
    
    // Save PDF
    doc.save(`Certificate_of_Disposal_${log.fileId || 'Record'}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Disposal Records</h1>
          <p className="text-muted-foreground">Log of permanently deleted records and certificates of disposal</p>
        </div>
        <Button onClick={fetchDisposals} variant="outline" size="icon" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" /> Disposed Records
          </CardTitle>
          <CardDescription>
            {disposalLogs.length} historical disposal record{disposalLogs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Record ID</th>
                <th className="px-6 py-4 font-medium">Date Disposed</th>
                <th className="px-6 py-4 font-medium">Disposed By</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && disposalLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Loading disposal records...
                  </td>
                </tr>
              ) : disposalLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No disposal records found.
                  </td>
                </tr>
              ) : (
                disposalLogs.map((log: any) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium font-mono text-xs">
                      {log.fileId || 'Unknown ID'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      {log.disposedBy}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {log.reason}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => generateCertificate(log)}
                      >
                        <FileText className="h-4 w-4 mr-1" /> Certificate
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminDisposal;
