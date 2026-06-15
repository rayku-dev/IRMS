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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllSections, type Section } from '../../services/sectionService';
import { getAllFolders, type Folder } from '../../services/folderService';
import { type FileData } from '../../services/fileService';

interface MoveFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (fileId: string, newFolderId: string) => Promise<void>;
  file: FileData | null;
}

const MoveFileDialog: React.FC<MoveFileDialogProps> = ({ isOpen, onClose, onMove, file }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAllSections().then(setSections).catch(console.error);
      setSelectedSection('');
      setSelectedFolder('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSection) {
      getAllFolders(selectedSection, undefined, 1, 1000)
        .then(data => setFolders(data.folders || data))
        .catch(console.error);
    } else {
      setFolders([]);
    }
  }, [selectedSection]);

  const handleMove = async () => {
    if (!selectedFolder || !file) return;
    setLoading(true);
    try {
      await onMove(file.id, selectedFolder);
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
          <DialogTitle>Move File</DialogTitle>
          <DialogDescription>
            Move <strong>{file?.originalName}</strong> to a different folder.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Select Section</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a section..." />
              </SelectTrigger>
              <SelectContent>
                {sections.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSection && (
            <div className="grid gap-2 animate-in fade-in zoom-in-95">
              <Label>Select Folder</Label>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a destination folder..." />
                </SelectTrigger>
                <SelectContent>
                  {folders.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                  {folders.length === 0 && (
                    <SelectItem value="empty" disabled>No folders found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleMove} disabled={!selectedFolder || loading}>
            {loading ? 'Moving...' : 'Move File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MoveFileDialog;
