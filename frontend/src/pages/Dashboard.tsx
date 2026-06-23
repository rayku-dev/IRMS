import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3,
  RefreshCw,
  Archive, 
  Database, 
  Warehouse, 
  FileText, 
  Building2,
  CheckCircle,
  Plus,
  Trash2,
  Edit3,
  ShieldCheck,
  type LucideIcon
} from 'lucide-react';
import { getStatistics } from '../services/statisticsService';
import { getAllSections, type Section, deleteSection, updateSection, createSection } from '../services/sectionService';
import RecentActivity from '../components/RecentActivity';
import { useRecentActivity } from '../contexts/RecentActivityContext';
import { toast } from 'sonner';
import AddSectionModal from '../components/modals/AddSectionModal';
import RenameSectionModal from '../components/modals/RenameSectionModal';
import DeleteSectionModal from '../components/modals/DeleteSectionModal';
import SearchFilter from '../components/SearchFilter';

type Statistics = {
  sections: {
    total: number;
    storageRooms: number;
    activeForms: number;
    adminAreas: number;
  };
  timestamp: string;
};

const getSectionColors = (icon: string, name: string) => {
  const iconLower = icon.toLowerCase();
  const nameLower = name.toLowerCase();
  
  if (iconLower === 'archive' || nameLower.includes('archive')) {
    return { bg: 'bg-orange-500', text: 'text-orange-600', border: 'hover:border-orange-300' };
  } else if (iconLower === 'database' || nameLower.includes('storage') || nameLower.includes('room')) {
    return { bg: 'bg-blue-500', text: 'text-blue-600', border: 'hover:border-blue-300' };
  } else if (iconLower === 'warehouse' || nameLower.includes('warehouse')) {
    return { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'hover:border-emerald-300' };
  } else if (iconLower === 'filetext' || nameLower.includes('form') || nameLower.includes('document')) {
    return { bg: 'bg-purple-500', text: 'text-purple-600', border: 'hover:border-purple-300' };
  } else if (iconLower === 'building2' || nameLower.includes('office') || nameLower.includes('admin')) {
    return { bg: 'bg-indigo-500', text: 'text-indigo-600', border: 'hover:border-indigo-300' };
  } else {
    return { bg: 'bg-slate-500', text: 'text-slate-600', border: 'hover:border-slate-300' };
  }
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);

  const { activities, addActivity } = useRecentActivity();

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setLoadingSections(true);
      const [stats, secs] = await Promise.all([
        getStatistics(),
        getAllSections()
      ]);
      setStatistics(stats);
      setSections(secs);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsRefreshing(false);
      setLoadingSections(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData();
    window.addEventListener('sections-updated', handleUpdate);
    return () => window.removeEventListener('sections-updated', handleUpdate);
  }, [fetchData]);

  const handleAddSection = async (sectionData: { name: string; description: string; icon: string; path: string; typeId: string; }) => {
    try {
      const newSection = {
        name: sectionData.name,
        description: sectionData.description || 'Custom section for organizing your records and folders.',
        typeId: sectionData.typeId,
        icon: sectionData.icon,
        active: true
      };
      const created = await createSection(newSection);
      toast.success('Section added');
      addActivity({
        action: 'Added section',
        description: `Section "${created.name}" was created`,
        type: 'add',
        user: user?.username
      });
      window.dispatchEvent(new Event('sections-updated'));
      if (created && (created.slug || created.id)) {
        navigate(`/folder/${created.slug || created.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error adding section');
    }
  };

  const handleRenameSection = async (sectionId: string, data: { name: string; description?: string; icon?: string; typeId?: string }) => {
    try {
      const result: any = await updateSection(sectionId, data);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('Section renamed');
        addActivity({
          action: 'Renamed section',
          description: `Section renamed to "${data.name || 'new name'}"`,
          type: 'edit',
          user: user?.username
        });
        window.dispatchEvent(new Event('sections-updated'));
      }
    } catch (err: any) {
      toast.error(err.message || 'Error renaming section');
      throw err;
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    setSectionToDelete(section || null);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    try {
      const result: any = await deleteSection(sectionToDelete.id);
      if (result?.pending) {
        toast.info(result.message);
      } else {
        toast.success('Section deleted');
        addActivity({
          action: 'Deleted section',
          description: `Section "${sectionToDelete.name}" was deleted`,
          type: 'delete',
          user: user?.username
        });
        window.dispatchEvent(new Event('sections-updated'));
      }
      setShowDeleteModal(false);
      setSectionToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting section');
      setShowDeleteModal(false);
    }
  };

  const filteredSections = sections
    .filter(section => {
      if (searchQuery && !section.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date((b as any).createdAt || 0).getTime() - new Date((a as any).createdAt || 0).getTime();
      return 0;
    });

  const staticAdminSections = user?.role === 'admin' ? [
    {
      id: 'static-archive',
      name: 'Archive',
      description: 'Manage and view all archived system records.',
      icon: 'Archive',
      slug: 'admin/archive',
      isStatic: true
    },
    {
      id: 'static-disposal',
      name: 'Disposal',
      description: 'Manage records queued for disposal and view disposal certificates.',
      icon: 'ShieldCheck',
      slug: 'admin/disposal',
      isStatic: true
    }
  ] : [];

  const combinedSections = [
    ...filteredSections,
    ...staticAdminSections.filter(staticSec => 
      !searchQuery || staticSec.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ];

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
          onClick={fetchData}
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
          <div className="flex items-center justify-between mb-2 mt-4">
            <h2 className="text-xl font-semibold">System Sections</h2>
            {user?.role === 'admin' && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow hover:bg-primary/90 transition font-medium"
              >
                <Plus className="h-4 w-4" /> Add Section
              </button>
            )}
          </div>
          
          <SearchFilter 
            onSearch={setSearchQuery} 
            onFilter={() => {}} 
            onSort={setSortBy} 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loadingSections ? (
              <div className="col-span-3 text-center text-muted-foreground">Loading sections...</div>
            ) : combinedSections.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-dashed">
                <Archive className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">No Sections Found</h2>
                {user?.role === 'admin' ? (
                  <>
                    <p className="text-muted-foreground mb-4">Get started by creating your first section.</p>
                    <button onClick={() => setIsAddOpen(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow hover:bg-primary/90 transition">
                      Add Section
                    </button>
                  </>
                ) : (
                  <p className="text-muted-foreground mb-4">No sections have been created yet.</p>
                )}
              </div>
            ) : (
              combinedSections.map((section: any) => {
                const iconMap: Record<string, LucideIcon> = { Archive, Database, Warehouse, FileText, Building2, ShieldCheck };
                const Icon = iconMap[section.icon] || Archive;
                const colors = getSectionColors(section.icon, section.name);
                
                return (
                  <div
                    key={section.id}
                    className={`relative bg-card rounded-xl shadow-md border p-6 group cursor-pointer transition-all duration-200 hover:shadow-lg ${colors.border} overflow-hidden`}
                    onClick={() => navigate(section.isStatic ? `/${section.slug}` : `/folder/${section.slug || section.id}`)}
                  >
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`${colors.bg} p-3 rounded-lg shadow-sm`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-bold truncate mb-1 group-hover:${colors.text} transition-colors flex items-center gap-2`}>
                          {section.name}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2" title={section.description}>
                          {section.description}
                        </p>
                      </div>
                      {user?.role === 'admin' && !section.isStatic && (
                        <div className="ml-2 flex gap-1">
                          <button
                            className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-all"
                            onClick={(e) => { e.stopPropagation(); setSelectedSection(section); setIsRenameOpen(true); }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-all"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <RecentActivity activities={activities} maxItems={6} />
        </div>
      </div>

      <AddSectionModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={handleAddSection} />
      <RenameSectionModal isOpen={isRenameOpen} onClose={() => setIsRenameOpen(false)} onRename={handleRenameSection} section={selectedSection} />
      <DeleteSectionModal open={showDeleteModal} onCancel={() => { setShowDeleteModal(false); setSectionToDelete(null); }} onConfirm={handleConfirmDeleteSection} sectionName={sectionToDelete?.name} />
    </div>
  );
};

export default Dashboard;
