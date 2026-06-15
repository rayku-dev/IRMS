import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FilterOptions {
  type: string;
  status: string;
  year: string;
}

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: FilterOptions) => void;
  onSort: (sortBy: string) => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({ onSearch, onFilter, onSort }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    type: '',
    status: '',
    year: ''
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value === 'all' ? '' : value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilters = () => {
    setFilters({ type: '', status: '', year: '' });
    setSearchQuery('');
    onFilter({ type: '', status: '', year: '' });
    onSearch('');
  };

  const hasActiveFilters = searchQuery || filters.type || filters.status || filters.year;

  return (
    <div className="bg-card rounded-xl shadow-sm border p-4 mb-6 transition-all">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search sections by name..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* Filter Toggle */}
        <Button
          variant={showFilters || hasActiveFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters ? (
            <span className="bg-primary-foreground text-primary text-xs rounded-full px-2 py-0.5 ml-1 font-bold">
              {[searchQuery, filters.type, filters.status, filters.year].filter(Boolean).length}
            </span>
          ) : null}
        </Button>

        {/* Sort Dropdown */}
        <Select onValueChange={onSort} defaultValue="name">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="date">Sort by Date Added</SelectItem>
            <SelectItem value="type">Sort by Type</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters ? (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        ) : null}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filters.type || "all"} onValueChange={(v) => handleFilterChange('type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="storage">Storage Room</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="archive">Archive</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status || "all"} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={filters.year || "all"} onValueChange={(v) => handleFilterChange('year', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
