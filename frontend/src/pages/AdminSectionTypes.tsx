import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import SectionTypeManager from '../components/SectionTypeManager';

const AdminSectionTypes: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Section Type Management</h1>
          <p className="text-muted-foreground">Manage section types and their icons</p>
        </div>
      </div>
      <SectionTypeManager />
    </div>
  );
};

export default AdminSectionTypes;
