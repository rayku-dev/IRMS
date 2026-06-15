import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

const COMMON_ICONS = [
  'Archive', 'Database', 'Warehouse', 'FileText', 'Building2', 
  'Folder', 'FolderOpen', 'Briefcase', 'Book', 'File', 
  'Inbox', 'Layout', 'Server', 'Shield', 'Users', 
  'Home', 'Settings', 'Star', 'Heart', 'Image'
];

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredIcons = useMemo(() => {
    if (!search) return COMMON_ICONS;
    
    const searchLower = search.toLowerCase();
    const allIconNames = Object.keys(LucideIcons).filter(key => 
      typeof (LucideIcons as any)[key] === 'object' || typeof (LucideIcons as any)[key] === 'function'
    );
    
    return allIconNames
      .filter(name => name.toLowerCase().includes(searchLower))
      .slice(0, 50);
  }, [search]);

  const renderIcon = (name: string, className?: string) => {
    const IconComponent = (LucideIcons as any)[name];
    if (!IconComponent) return <LucideIcons.HelpCircle className={className} />;
    return <IconComponent className={className} />;
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button 
        type="button"
        variant="outline" 
        className="w-full justify-start text-left font-normal flex items-center gap-2"
        onClick={() => setOpen(!open)}
      >
        {value ? (
          <>
            {renderIcon(value, "h-4 w-4")}
            <span>{value}</span>
          </>
        ) : (
          <>
            <LucideIcons.MousePointerClick className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Select an icon...</span>
          </>
        )}
      </Button>

      {open && (
        <div className="absolute z-50 w-80 p-0 mt-2 bg-popover text-popover-foreground rounded-md border shadow-md">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search icons..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 border-0 shadow-none focus-visible:ring-0 px-0"
            />
          </div>
          <div className="p-3 h-64 overflow-y-auto grid grid-cols-5 gap-2">
            {filteredIcons.map((iconName) => (
              <Button
                key={iconName}
                type="button"
                variant={value === iconName ? "default" : "ghost"}
                className="h-10 w-10 p-0 flex items-center justify-center"
                onClick={() => {
                  onChange(iconName);
                  setOpen(false);
                  setSearch('');
                }}
                title={iconName}
              >
                {renderIcon(iconName, "h-5 w-5")}
              </Button>
            ))}
            {filteredIcons.length === 0 && (
              <div className="col-span-5 text-center text-sm text-muted-foreground py-4">
                No icons found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IconPicker;
