import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface Activity {
  id?: string;
  action: string;
  description: string;
  type: 'add' | 'edit' | 'delete' | 'system';
  user?: string;
  timestamp?: Date;
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

  const addActivity = (activity: Activity) => {
    setActivities((prev) => [{ ...activity, timestamp: new Date(), id: Math.random().toString() }, ...prev].slice(0, 50));
  };

  return (
    <RecentActivityContext.Provider value={{ activities, addActivity }}>
      {children}
    </RecentActivityContext.Provider>
  );
};
