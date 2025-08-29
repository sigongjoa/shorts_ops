import React, { useState, useEffect } from 'react';
import type { Project } from '../types/youtube-shorts-content-factory/types';
import { Dashboard } from '../components/youtube-shorts-content-factory/Dashboard';
import { ProjectView } from '../components/youtube-shorts-content-factory/ProjectView';
import { Header } from '../components/youtube-shorts-content-factory/Header';
import { fetchProjectsAndShorts, saveProject, deleteProject } from '../services/youtube-shorts-content-factory/localStorageService';
import sheetsService from '../services/sheetsService';
import docsService from '../services/docsService';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchProjectsAndShorts();
        console.log("Fetched projects on load:", data); // Add this line
        setProjects(data);
      } catch (error) {
        console.error("App.tsx: Error fetching projects:", error);
        alert("Failed to load projects. Check console for details.");
      }
    };
    loadData();
  }, []);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    await saveProject(updatedProject);
    const data = await fetchProjectsAndShorts();
    console.log("Fetched projects after update:", data); // Add this line
    setProjects(data);
    if (selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
    }
  };

  const handleAddProject = async (newProject: Project) => {
    // The backend will now handle Google Doc creation based on driveFolderUrl
    // We will save the project and then fetch updated projects to get the driveDocumentId
    await saveProject(newProject); // Save the project initially
    const data = await fetchProjectsAndShorts(); // Re-fetch to get the updated project with driveDocumentId from backend
    console.log("Fetched projects after add:", data);
    setProjects(data);
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
    const data = await fetchProjectsAndShorts();
    console.log("Fetched projects after delete:", data); // Add this line
    setProjects(data);
  };

  return (
    <div className="min-h-screen bg-white font-sans">
        <Header />
        <main>
            {selectedProject ? (
                <ProjectView 
                    project={selectedProject} 
                    onBack={handleBackToDashboard} 
                    onUpdateProject={handleUpdateProject}
                />
            ) : (
                <Dashboard 
                    projects={projects} 
                    onSelectProject={handleSelectProject} 
                    onAddProject={handleAddProject}
                    onDeleteProject={handleDeleteProject}
                />
            )}
        </main>
    </div>
  );
};

export default App;