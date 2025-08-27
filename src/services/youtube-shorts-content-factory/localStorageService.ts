import type { Project, Short } from '../../types/youtube-shorts-content-factory/types';

// --- Public API ---

export const fetchProjectsAndShorts = async (): Promise<Project[]> => {
  try {
    const response = await fetch('/api/projects');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data as Project[];
  } catch (error) {
    console.error("Failed to fetch projects from backend:", error);
    throw error; // Propagate the error
  }
};

const updateBackendProjects = async (projects: Project[]): Promise<void> => {
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projects),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to update projects on backend:", error);
    throw error; // Propagate the error
  }
};

export const saveProject = async (projectToSave: Project): Promise<void> => {
  const currentProjects = await fetchProjectsAndShorts(); 

  const projectIndex = currentProjects.findIndex(p => p.id === projectToSave.id);

  if (projectIndex > -1) {
    currentProjects[projectIndex] = projectToSave;
  } else {
    currentProjects.unshift(projectToSave);
  }
  await updateBackendProjects(currentProjects);
};

export const saveShort = async (projectId: string, shortToSave: Short): Promise<void> => {
    const currentProjects = await fetchProjectsAndShorts();

    const project = currentProjects.find(p => p.id === projectId);

    if (!project) {
        console.error(`Project with id ${projectId} not found.`);
        return;
    }

    const shortIndex = project.shorts.findIndex(s => s.id === shortToSave.id);

    if (shortIndex > -1) {
        project.shorts[shortIndex] = shortToSave;
    } else {
        project.shorts.push(shortToSave);
    }

    await updateBackendProjects(currentProjects);
};

export const deleteProject = async (projectId: string): Promise<void> => {
    const currentProjects = await fetchProjectsAndShorts();

    const updatedProjects = currentProjects.filter(p => p.id !== projectId);
    await updateBackendProjects(updatedProjects);
};
