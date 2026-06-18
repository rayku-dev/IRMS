import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy loading pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Records = lazy(() => import('./pages/Records'));
const Login = lazy(() => import('./pages/Login'));
const FolderView = lazy(() => import('./pages/FolderView'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminSectionTypes = lazy(() => import('./pages/AdminSectionTypes'));
const AdminApprovals = lazy(() => import('./pages/AdminApprovals'));
const NAPForm1 = lazy(() => import('./pages/NAPForm1'));

// Loading fallback UI
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

import { AuthProvider } from './contexts/AuthContext';
import { RecentActivityProvider } from './contexts/RecentActivityContext';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
      <RecentActivityProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected layout wrapping main application */}
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="records" element={<Records />} />
              <Route path="folder/:section" element={<FolderView />} />
              <Route path="folder/:section/:subfolder" element={<FolderView />} />
              <Route path="folder/:section/:subfolder/:subsubfolder" element={<FolderView />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/section-types" element={<AdminSectionTypes />} />
              <Route path="admin/approvals" element={<AdminApprovals />} />
              <Route path="nap-form-1" element={<NAPForm1 />} />
              {/* Add more lazy-loaded nested routes here */}
            </Route>
            
            {/* Catch-all 404 Route */}
            <Route path="*" element={
              <div className="flex h-screen items-center justify-center">
                <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
              </div>
            } />
          </Routes>
        </Suspense>
        <Toaster />
      </RecentActivityProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
