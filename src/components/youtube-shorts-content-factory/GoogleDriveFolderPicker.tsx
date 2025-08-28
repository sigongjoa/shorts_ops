import React, { useState, useEffect } from 'react';
import { Button } from './common/Button';

interface GoogleDriveFolderPickerProps {
  onSelectFolder: (folderId: string, folderName: string) => void;
  onClose: () => void;
}

interface DriveFolder {
  id: string;
  name: string;
  webViewLink: string;
}

export const GoogleDriveFolderPicker: React.FC<GoogleDriveFolderPickerProps> = ({ onSelectFolder, onClose }) => {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null);

  useEffect(() => {
    const fetchFolders = async () => {
      setLoading(true); // Set loading to true when fetch starts
      setError(null); // Clear previous errors
      try {
        const response = await fetch('/api/drive/folders', {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setFolders(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false); // Set loading to false when fetch completes
      }
    };
    fetchFolders();
  }, []);

  if (loading) return <div className="p-4 text-center text-gray-600">Loading folders...</div>;
  if (error) return <div className="p-4 text-red-500 text-center">Error: {error}</div>;

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Select a Google Drive Folder</h3>
      <div className="max-h-60 overflow-y-auto border rounded-md mb-4">
        {folders.length === 0 ? (
          <p className="p-4 text-gray-500">No folders found in your Google Drive.</p>
        ) : (
          <ul>
            {folders.map((folder) => (
              <li
                key={folder.id}
                className={`p-2 cursor-pointer hover:bg-gray-100 ${selectedFolder?.id === folder.id ? 'bg-blue-100' : ''}`}
                onClick={() => setSelectedFolder(folder)}
              >
                {folder.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => selectedFolder && onSelectFolder(selectedFolder.id, selectedFolder.name)}
          disabled={!selectedFolder}
        >
          Select
        </Button>
      </div>
    </div>
  );
};