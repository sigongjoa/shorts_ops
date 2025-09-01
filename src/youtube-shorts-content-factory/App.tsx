import React, { useState, useEffect } from 'react';
import type { Project } from '../types/youtube-shorts-content-factory/types';
import { Dashboard } from '../components/youtube-shorts-content-factory/Dashboard';
import { ProjectView } from '../components/youtube-shorts-content-factory/ProjectView';
import { Header } from '../components/youtube-shorts-content-factory/Header';
import projectService from '../services/youtube-shorts-content-factory/projectService';
import sheetsService from '../services/sheetsService';
import docsService from '../services/docsService';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await projectService.fetchProjectsAndShorts();
        console.log("Fetched projects on load:", data); // Add this line
        const safeData = Array.isArray(data) ? data : [data];
        setProjects(safeData);
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
    try {
      const savedProject = await projectService.saveProject(updatedProject);
      // After saving, re-fetch all projects to ensure UI is consistent with backend
      const data = await projectService.fetchProjectsAndShorts();
      console.log("Fetched projects after update:", data);
      setProjects(data);
      if (selectedProject && selectedProject.id === savedProject.id) {
          setSelectedProject(savedProject);
      }
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project. Check console for details.");
    }
  };

  const handleAddProject = async (newProject: Project) => {
    try {
      const savedProject = await projectService.saveProject(newProject); // Capture the saved project
      setProjects((prevProjects) => [...prevProjects, savedProject]); // Add it to the state
      // No need to re-fetch all projects immediately here, as we have the updated project
    } catch (error) {
      console.error("Error adding project:", error);
      alert("Failed to add project. Check console for details.");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    await projectService.deleteProject(projectId);
    const data = await projectService.fetchProjectsAndShorts();
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