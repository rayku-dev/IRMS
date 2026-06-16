import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAuditLogs, createAuditLog } from '../services/auditService';
import { useAuth } from './AuthContext';

export interface Activity {
  id?: string;
  action: string;
  description: string;
  type: 'add' | 'edit' | 'delete' | 'system';
  user?: string;
  timestamp?: Date | string;
}

interface RecentActivityContextType {
  activities: Activity[];
  addActivity: (activity: Activity) => void;
}

const RecentActivityContext = createContext<RecentActivityContextType | undefined>(undefined);

export const useRecentActivity = () => {
  const context = useContext(RecentActivityContext);
  if (!context) {
    throw new Error('useRecentActivity must be used within a RecentActivityProvider');
  }
  return context;
};

export const RecentActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchActivities = async () => {
      try {
        const data = await getAuditLogs();
        setActivities(data);
      } catch (error) {
        console.error('Failed to fetch recent activities:', error);
      }
    };
    fetchActivities();
  }, [isAuthenticated]);

  const addActivity = async (activity: Activity) => {
    // Optimistic UI update
    const optimisticActivity = { ...activity, timestamp: new Date(), id: Math.random().toString() };
    setActivities((prev) => [optimisticActivity, ...prev].slice(0, 50));
    
    try {
      // Save to backend
      const savedActivity = await createAuditLog(activity);
      // Update with real ID from backend
      setActivities((prev) => 
        prev.map(a => a.id === optimisticActivity.id ? savedActivity : a)
      );
    } catch (error) {
      console.error('Failed to save activity:', error);
      // Revert optimistic update on failure
      setActivities((prev) => prev.filter(a => a.id !== optimisticActivity.id));
    }
  };

  return (
    <RecentActivityContext.Provider value={{ activities, addActivity }}>
      {children}
    </RecentActivityContext.Provider>
  );
};
