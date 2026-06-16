import React from 'react';
import { Clock, Plus, Edit, Trash2, FileText } from 'lucide-react';
import { type Activity } from '../contexts/RecentActivityContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface RecentActivityProps {
  activities: Activity[];
  maxItems?: number;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities, maxItems = 5 }) => {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'add':
        return <Plus className="h-4 w-4 text-emerald-600" />;
      case 'edit':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'add':
        return 'border-l-emerald-500 bg-emerald-500/10';
      case 'edit':
        return 'border-l-blue-500 bg-blue-500/10';
      case 'delete':
        return 'border-l-destructive bg-destructive/10';
      default:
        return 'border-l-muted-foreground bg-muted/50';
    }
  };

  const formatTimeAgo = (timestamp?: Date | string) => {
    if (!timestamp) return 'Just now';
    const time = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        <Clock className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {displayedActivities.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted mx-auto mb-3" />
            <p className="text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedActivities.map((activity, idx) => (
              <div
                key={activity.id || idx}
                className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${getActivityColor(activity.type)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">
                    {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {activity.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/80">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                    {activity.user && (
                      <span className="text-xs text-muted-foreground/80">
                        by {activity.user}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {activities.length > maxItems && (
          <div className="mt-4 pt-3 border-t">
            <button className="w-full text-sm text-primary hover:text-primary/80 font-medium">
              View all {activities.length} activities
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
