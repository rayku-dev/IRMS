import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Section, getSectionTypes } from '../../services/sectionService';
import IconPicker from '../IconPicker';

interface RenameSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (id: string, data: { name: string; description?: string; icon?: string; typeId?: string }) => Promise<void>;
  section: Section | null;
}

const RenameSectionModal: React.FC<RenameSectionModalProps> = ({ isOpen, onClose, onRename, section }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Archive');
  const [loading, setLoading] = useState(false);
  const [typeId, setTypeId] = useState('');
  const [types, setTypes] = useState<any[]>([]);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const data = await getSectionTypes();
      setTypes(data);
    } catch (error) {
      console.error('Failed to load types:', error);
    }
  };

  useEffect(() => {
    if (section && isOpen) {
      setName(section.name || '');
      setDescription(section.description || '');
      setIcon(section.icon || 'Archive');
      setTypeId(section.typeId || (types.length > 0 ? types[0].id : ''));
    }
  }, [section, isOpen, types]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !section) return;
    
    setLoading(true);
    try {
      await onRename(section.id, { name, description, icon, typeId });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
          <DialogDescription>
            Make changes to your section details here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Section Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-typeId">Section Type</Label>
              <select
                id="edit-typeId"
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Icon</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RenameSectionModal;
