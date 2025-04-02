import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }) => {
  const [activeProject, setActiveProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateProject = (updatedProject) => {
    if (updatedProject) {
      setActiveProject(updatedProject);
      localStorage.setItem('activeProject', JSON.stringify(updatedProject));

      // Also update project in projects list
      setProjects(projects.map(p =>
        p.id === updatedProject.id ? updatedProject : p
      ));
    }
  };

  useEffect(() => {
    // Try to load previously selected project from localStorage
    const savedProject = localStorage.getItem('activeProject');
    if (savedProject) {
      try {
        setActiveProject(JSON.parse(savedProject));
      } catch (e) {
        localStorage.removeItem('activeProject');
      }
    }

    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading projects from API...');
      const response = await api.get('/research/projects');
      console.log('Projects loaded successfully:', response.data);
      setProjects(response.data);
    } catch (err) {
      console.error('Error loading projects:', err);
      // Format error properly to ensure it's a string, not an object
      const errorMessage = err.response?.data?.detail 
        ? (typeof err.response.data.detail === 'object' 
            ? JSON.stringify(err.response.data.detail) 
            : err.response.data.detail)
        : 'Could not load projects';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectProject = (project) => {
    setActiveProject(project);
    if (project) {
      localStorage.setItem('activeProject', JSON.stringify(project));
    } else {
      localStorage.removeItem('activeProject');
    }
  };

  const createProject = async (projectData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/research/projects', projectData);
      const newProject = response.data;

      // Add new project to the projects list
      setProjects([...projects, newProject]);

      // Set it as active
      selectProject(newProject);

      return newProject;
    } catch (err) {
      console.error('Error creating project:', err);
      // Format error properly to ensure it's a string, not an object
      const errorMessage = err.response?.data?.detail 
        ? (typeof err.response.data.detail === 'object' 
            ? JSON.stringify(err.response.data.detail) 
            : err.response.data.detail)
        : 'Could not create project';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        projects,
        loading,
        error,
        selectProject,
        createProject,
        loadProjects,
        updateProject
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};