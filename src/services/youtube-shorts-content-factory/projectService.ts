import api from '../../api';
import type { Project } from '../../types/youtube-shorts-content-factory/types';

const projectService = {
  fetchProjectsAndShorts: async (): Promise<Project[]> => {
    const response = await api.get('/api/projects');
    return response.data;
  },

  saveProject: async (project: Project): Promise<Project> => {
    if (project.id) {
      // Update existing project
      const response = await api.put(`/api/projects/${project.id}`, project);
      return response.data;
    } else {
      // Create new project
      const response = await api.post('/api/projects', project);
      return response.data;
    }
  },

  deleteProject: async (projectId: string): Promise<void> => {
    await api.delete(`/api/projects/${projectId}`);
  },
};

export default projectService;