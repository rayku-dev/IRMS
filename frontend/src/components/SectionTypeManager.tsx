import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Library, Trash2, Edit2, Plus, X, Check } from 'lucide-react';
import { getSectionTypes, createSectionType, updateSectionType, deleteSectionType } from '../services/sectionService';

const SectionTypeManager: React.FC = () => {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const data = await getSectionTypes();
      setTypes(data);
    } catch (error) {
      toast.error('Failed to load section types');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    try {
      await createSectionType({ name: newTypeName.trim() });
      toast.success('Section type added successfully');
      setNewTypeName('');
      setShowForm(false);
      fetchTypes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add section type');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    try {
      await updateSectionType(id, { name: editName.trim() });
      toast.success('Section type updated successfully');
      setEditingId(null);
      fetchTypes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update section type');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteSectionType(id);
      toast.success('Section type deleted successfully');
      fetchTypes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete section type. It might be in use.');
    }
  };

  const startEditing = (type: any) => {
    setEditingId(type.id);
    setEditName(type.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <Card className="mt-8 border-blue-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5 text-blue-600" />
            Section Types Library
          </CardTitle>
          <CardDescription>Manage the section types available for use</CardDescription>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2" variant="outline" size="sm">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Type'}
        </Button>
      </CardHeader>
      
      <CardContent>
        {showForm && (
          <form onSubmit={handleAdd} className="mb-6 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="newType">New Section Type Name</Label>
                <Input
                  id="newType"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Legal Documents"
                  required
                />
              </div>
              <Button type="submit" disabled={!newTypeName.trim()}>Add</Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading types...</div>
        ) : types.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-lg">
            No section types found
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map((type) => (
                  <tr key={type.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      {editingId === type.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-full max-w-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(type.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                      ) : (
                        <div className="font-medium">{type.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === type.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handleUpdate(type.id)} className="h-8 w-8 text-emerald-600">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={cancelEditing} className="h-8 w-8 text-muted-foreground">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                            onClick={() => startEditing(type)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(type.id, type.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SectionTypeManager;
