import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DriveBreadcrumbsProps {
  sectionSlug: string;
  sectionName: string;
  pathSegments: string[];
}

const DriveBreadcrumbs: React.FC<DriveBreadcrumbsProps> = ({ sectionSlug, sectionName, pathSegments }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center space-x-1 text-lg mb-6 flex-wrap">
      <button 
        onClick={() => navigate('/')}
        className="text-muted-foreground hover:bg-muted p-1.5 rounded-md transition-colors flex items-center"
      >
        <Home className="h-5 w-5" />
      </button>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      
      <button 
        onClick={() => navigate(`/folder/${sectionSlug}`)}
        className={`${pathSegments.length === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted'} px-2 py-1 rounded-md transition-colors truncate max-w-[200px]`}
      >
        {sectionName}
      </button>

      {pathSegments.map((segment, index) => {
        const isLast = index === pathSegments.length - 1;
        const pathToHere = [sectionSlug, ...pathSegments.slice(0, index + 1)].join('/');
        
        return (
          <React.Fragment key={pathToHere}>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <button
              onClick={() => navigate(`/folder/${pathToHere}`)}
              className={`${isLast ? 'font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted'} px-2 py-1 rounded-md transition-colors truncate max-w-[200px]`}
            >
              {segment}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default DriveBreadcrumbs;
