import React, { useState } from 'react';
import type { Project } from '../../types/youtube-shorts-content-factory/types'; // Adjusted to import type
import { Button } from './common/Button';
import { Input } from './common/Input';
import { TextArea } from './common/TextArea';
import { GoogleDriveFolderPicker } from './GoogleDriveFolderPicker';

interface DashboardProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onAddProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

const ProjectCard: React.FC<{ project: Project; onClick: () => void; onDelete: () => void; }> = ({ project, onClick, onDelete }) => (
  <div 
    className="bg-white rounded-xl p-6 group border border-gray-200 hover:border-indigo-500/50 shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
  >
    <div onClick={onClick} className="cursor-pointer">
      <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{project.name}</h3>
      <p className="text-gray-600 mt-2 text-sm">{project.description}</p>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
      <span className="text-sm font-semibold text-indigo-600">{project.shorts.length} Shorts</span>
      <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }}>Delete</Button>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ projects, onSelectProject, onAddProject, onDeleteProject }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [newProjectDriveLocation, setNewProjectDriveLocation] = useState('');
    const [newProjectDriveLocationName, setNewProjectDriveLocationName] = useState('No folder selected');
    const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);

    const handleAddProject = () => {
        if (!newProjectName.trim()) {
            alert("Project name is required.");
            return;
        }
        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name: newProjectName,
            description: newProjectDesc,
            shorts: [],
            driveLocation: newProjectDriveLocation.trim() || undefined, // Add driveLocation
        };
        onAddProject(newProject);
        setIsModalOpen(false);
        setNewProjectName('');
        setNewProjectDesc('');
        setNewProjectDriveLocation(''); // Clear drive location
        setNewProjectDriveLocationName('No folder selected');
    };

    const handleSelectDriveFolder = (folderId: string, folderName: string) => {
      setNewProjectDriveLocation(folderId);
      setNewProjectDriveLocationName(folderName);
      setIsFolderPickerOpen(false);
    };

    return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Projects Dashboard</h2>
        <Button onClick={() => setIsModalOpen(true)}>New Project</Button>
      </div>
      
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onClick={() => onSelectProject(p)} onDelete={() => onDeleteProject(p.id)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <h3 className="text-xl font-semibold text-gray-700">No Projects Found</h3>
            <p className="text-gray-600 mt-2">Get started by creating your first project.</p>
            <Button onClick={() => setIsModalOpen(true)} className="mt-6">Create a Project</Button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-40 flex justify-center items-center p-4" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Create New Project</h3>
                    <div className="space-y-4">
                        <Input label="Project Name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                        <TextArea label="Description" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Google Drive Folder</label>
                          <div className="flex items-center space-x-2">
                            <Input 
                              value={newProjectDriveLocationName}
                              readOnly
                              className="flex-grow bg-gray-50 cursor-not-allowed"
                              placeholder="Select a folder from Google Drive"
                            />
                            <Button type="button" onClick={() => setIsFolderPickerOpen(true)} variant="secondary">Browse</Button>
                          </div>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4 mt-6">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleAddProject}>Create</Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {isFolderPickerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={() => setIsFolderPickerOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <GoogleDriveFolderPicker 
              onSelectFolder={handleSelectDriveFolder} 
              onClose={() => setIsFolderPickerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};