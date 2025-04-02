import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, PlusCircle, Clock, CheckCircle, Archive, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useProject } from '../contexts/ProjectContext';
import OrganizationProjectFilter from '../components/research/OrganizationProjectFilter'; // Import the filter
import Loading from '../components/ui/Loading'; // Assuming Loading component exists
import Alert from '../components/ui/Alert'; // Assuming Alert component exists

const ResearchProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { activeOrgId, selectProject } = useProject(); // Get activeOrgId from context
  const navigate = useNavigate();

  const fetchProjects = useCallback(async (orgId) => {
    try {
      setLoading(true);
      setError(null);
      const params = orgId ? { organization_id: orgId } : {};
      const response = await api.get('/research/projects', { params });
      setProjects(response.data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.response?.data?.detail || 'Failed to load projects');
      setProjects([]); // Clear projects on error
    } finally {
      setLoading(false);
    }
  }, []); // fetchProjects itself doesn't depend on external state here

  useEffect(() => {
    fetchProjects(activeOrgId); // Fetch based on active org from context
  }, [activeOrgId, fetchProjects]); // Refetch when activeOrgId or fetchProjects changes

  const handleSelectProject = (project) => {
    selectProject(project); // Set project as active in context
    navigate(`/research/${project.id}`); // Navigate to project detail
  };

  const handleCreateProject = () => {
    // Pass activeOrgId if available to pre-select organization in the creation form
    navigate(`/research/new${activeOrgId ? `?org=${activeOrgId}` : ''}`);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'archived': return <Archive className="w-5 h-5 text-gray-500" />;
      default: return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Research Projects</h1>
        <button
          onClick={handleCreateProject}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
        >
          <PlusCircle className="w-4 h-4 mr-2" /> New Project
        </button>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Add the Organization Filter */}
      <OrganizationProjectFilter />

      {loading ? (
        <Loading message="Loading projects..." />
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Research Projects Found</h2>
          <p className="text-gray-600 mb-6">
            {activeOrgId ? 'No projects found for this organization.' : 'Get started by creating your first research project.'}
          </p>
          <button
            onClick={handleCreateProject}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleSelectProject(project)}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-semibold">{project.title}</h2>
                  <div className="flex items-center text-xs text-gray-500">
                    {getStatusIcon(project.status)}
                    <span className="ml-1 capitalize">{project.status}</span>
                  </div>
                </div>
                <p className="text-gray-600 mb-4 line-clamp-3 h-16">
                  {project.description || 'No description provided'}
                </p>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {project.participant_count || 0} participants
                  </div>
                  <div className="flex items-center text-blue-600 hover:text-blue-800">
                    <span className="text-sm font-medium">Details</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResearchProjects;