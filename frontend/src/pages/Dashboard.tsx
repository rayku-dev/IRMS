import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { getStatistics, getAuditStats } from '../services/statisticsService';
import RecentActivity from '../components/RecentActivity';
import { useRecentActivity } from '../contexts/RecentActivityContext';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type Statistics = {
  sections: {
    total: number;
    storageRooms: number;
    activeForms: number;
    adminAreas: number;
  };
  timestamp: string;
};




const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [auditStats, setAuditStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { activities } = useRecentActivity();

  const fetchStatistics = async () => {
    try {
      setIsRefreshing(true);
      const [stats, audit] = await Promise.all([
        getStatistics(),
        getAuditStats()
      ]);
      setStatistics(stats);
      setAuditStats(audit);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load statistics');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const stats = statistics ? [
    { label: 'Total Sections', value: statistics.sections.total, color: 'text-blue-600' },
    { label: 'Storage Rooms', value: statistics.sections.storageRooms, color: 'text-emerald-600' },
    { label: 'Active Forms', value: statistics.sections.activeForms, color: 'text-purple-600' },
    { label: 'Admin Areas', value: statistics.sections.adminAreas, color: 'text-amber-600' }
  ] : [];



  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.username}</h1>
          <p className="text-muted-foreground">Access your inventory records and manage system data efficiently</p>
        </div>
        <button
          onClick={fetchStatistics}
          disabled={isRefreshing}
          className={`p-2 rounded-lg transition-all duration-200 ${isRefreshing ? 'bg-muted cursor-not-allowed' : 'hover:bg-muted'}`}
        >
          <RefreshCw className={`h-5 w-5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statistics ? stats.map((stat, index) => (
          <div key={index} className={`bg-card rounded-xl shadow-md border p-6 transition-opacity duration-200 overflow-hidden relative ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <BarChart3 className={`h-8 w-8 ${stat.color}`} />
            </div>
          </div>
        )) : <div className="col-span-4 bg-muted/50 border rounded-xl p-4 text-muted-foreground">Loading statistics...</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card rounded-xl shadow-md border p-6 min-h-[350px]">
            <h3 className="text-lg font-medium mb-4">System Activity Over Time</h3>
            {auditStats ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={auditStats.systemActivityOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="actions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorActions)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground animate-pulse">Loading chart...</div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl shadow-md border p-6 min-h-[300px]">
              <h3 className="text-lg font-medium mb-4">Action Distribution</h3>
              {auditStats ? (
                <div className="h-[250px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={auditStats.actionDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {auditStats.actionDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground animate-pulse">Loading chart...</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <RecentActivity activities={activities} maxItems={6} />
        </div>
      </div>


    </div>
  );
};

export default Dashboard;
