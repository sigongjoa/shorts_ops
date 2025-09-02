import React, { useState } from 'react';
import type { Project, Short } from '../../types/youtube-shorts-content-factory/types'; // Adjusted to import type
import { ShortStatus } from '../../types/youtube-shorts-content-factory/types'; // ShortStatus is an enum, so regular import
import { Button } from './common/Button';
import { ShortCard } from './ShortCard';
import { ShortDetailModal } from './ShortDetailModal';
import { Input } from './common/Input';
import docsService from '../../services/docsService'; // Import docsService

interface ProjectViewProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ project, onBack, onUpdateProject }) => {
  const [selectedShort, setSelectedShort] = useState<Short | null>(null);
  const [newShortTitle, setNewShortTitle] = useState('');
  const [isAddingShort, setIsAddingShort] = useState(false); // New loading state

  const handleSaveShort = (updatedShort: Short) => {
    const updatedShorts = project.shorts.map(s => s.id === updatedShort.id ? updatedShort : s);
    onUpdateProject({ ...project, shorts: updatedShorts });
    setSelectedShort(null);
  };

  const handleDeleteShort = async (shortId: string) => {
    if (!window.confirm('Are you sure you want to delete this short?')) {
      return;
    }
    try {
      // Delete from Google Doc if linked
      if (project.driveDocumentId) {
        await docsService.deleteParagraph(project.googleDocId, shortId);
        console.log('Short deleted from Google Doc successfully!');
      }

      // Delete from local state
      const updatedShorts = project.shorts.filter(s => s.id !== shortId);
      onUpdateProject({ ...project, shorts: updatedShorts });
      setSelectedShort(null); // Close modal if the deleted short was open

    } catch (error) {
      console.error('Error deleting short:', error);
      alert('Failed to delete short. Check console for details.');
    }
  };
  
  const handleAddNewShort = async () => { // Make it async
    if (!newShortTitle.trim()) {
      alert("Please enter a title for the new short.");
      return;
    }

    setIsAddingShort(true); // Start loading
    try {
      const newShort: Short = {
        id: `short-${project.id}-${Date.now()}`,
        projectId: project.id,
        title: newShortTitle.trim(),
        status: ShortStatus.IDEA,
        script: { idea: '', draft: '', hook: '', immersion: '', body: '', cta: '' },
        metadata: { tags: '', cta: '', imageIdeas: '', audioNotes: '' },
        googleDocId: project.driveDocumentId, // Set googleDocId to project's driveDocumentId
      };

      const updatedProject = { ...project, shorts: [newShort, ...project.shorts] };
      onUpdateProject(updatedProject);
      setNewShortTitle('');

      // Add short to Google Doc if project has a linked document
      if (project.driveDocumentId) {
        try {
          await docsService.addShortToDocument(project.driveDocumentId, newShort);
          console.log('Short added to Google Doc successfully!');
        } catch (error) {
          console.error('Failed to add short to Google Doc:', error);
          alert('Failed to add short to Google Doc. Check console for details.');
        }
      }
    } catch (error) {
        console.error('Error adding new short:', error);
        alert('Failed to add new short. Check console for details.');
    } finally {
        setIsAddingShort(false); // End loading
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Title,Status,Tags,CTA,Final Script\n";

    project.shorts.forEach(short => {
      const row = [
        `"${short.title.replace(/"/g, '""')}"`,
        short.status,
        `"${short.metadata.tags.replace(/"/g, '""')}"`,
        `"${short.metadata.cta.replace(/"/g, '""')}"`,
        `"${short.script.hook.replace(/"/g, '""')}
${short.script.immersion.replace(/"/g, '""')}
${short.script.body.replace(/"/g, '""')}
${short.script.cta.replace(/"/g, '""')}"`
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${project.name.replace(/\s+/g, '_')}_shorts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <button onClick={onBack} className="text-indigo-500 hover:text-indigo-700 mb-2 font-medium">&larr; Back to Projects</button>
          <h2 className="text-3xl font-bold text-gray-900">{project.name}</h2>
          <p className="text-gray-600 mt-1">{project.description}</p>
          {project.driveDocumentLink && (
            <div className="mt-2">
              <a 
                href={project.driveDocumentLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                Open Project Document in Google Drive
              </a>
            </div>
          )}
        </div>
        <Button onClick={exportToCSV} variant="secondary">Export All to CSV</Button>
      </div>
      
      {/* Add New Short Section */}
      <div className="bg-gray-100 p-4 rounded-lg mb-8 border border-gray-200">
        <div className="flex items-center gap-4">
          <Input 
            placeholder="Enter title for new Short..." 
            value={newShortTitle}
            onChange={e => setNewShortTitle(e.target.value)}
            className="flex-grow"
            onKeyDown={(e) => e.key === 'Enter' && handleAddNewShort()}
            disabled={isAddingShort}
          />
          <Button onClick={handleAddNewShort} disabled={isAddingShort}>
            {isAddingShort ? 'Adding...' : 'Add Short'}
          </Button>
        </div>
      </div>
      
      {/* Shorts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {project.shorts.map(short => (
          <ShortCard key={short.id} short={short} onClick={() => setSelectedShort(short)} onDelete={handleDeleteShort} />
        ))}
      </div>

      {selectedShort && (
        <ShortDetailModal 
          short={selectedShort} 
          onClose={() => setSelectedShort(null)} 
          onSave={handleSaveShort} 
          projectDriveDocumentId={project.driveDocumentId}
        />
      )}
    </div>
  );
};