import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { Plus, RefreshCw, Check, AlertCircle } from 'lucide-react'; // Added AlertCircle

const ProjectSelection = () => {
  const { activeProject, projects, selectProject, loading, error: projectContextError, refreshProjects, createProject } = useProject();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createError, setCreateError] = useState(null); // Local error state for creation form

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    setCreateError(null); // Clear previous create errors

    try {
      await createProject({
        title: newProjectTitle,
        description: newProjectDescription,
      });

      // Reset form and hide
      setNewProjectTitle('');
      setNewProjectDescription('');
      setShowNewProjectForm(false);
    } catch (err) {
      console.error('Failed to create project:', err);
      // Set local error state to display in the form area
      setCreateError(err.response?.data?.detail || 'Could not create project. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Select or Create Project</h3>
        <div className="flex space-x-2">
          <button
            className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 disabled:opacity-50"
            onClick={refreshProjects} // Use refreshProjects from context
            disabled={loading}
            title="Refresh Projects"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            onClick={() => { setShowNewProjectForm(!showNewProjectForm); setCreateError(null); }} // Clear error when toggling form
            title="New Project"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Display general project loading errors here */}
      {projectContextError && (
           <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
               Error loading projects: {projectContextError}
           </div>
       )}


      {showNewProjectForm && (
        <form onSubmit={handleCreateProject} className="mb-4 border rounded-lg p-4 bg-gray-50">
           {createError && ( // Display creation-specific errors
               <div className="mb-3 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                   {createError}
               </div>
           )}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Title*</label>
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter project title"
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter project description"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => { setShowNewProjectForm(false); setCreateError(null); }} // Clear error on cancel
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={!newProjectTitle.trim() || loading} // Disable if title empty or loading
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto pr-2"> {/* Added max height and scroll */}
        {projects.length === 0 && !loading && !projectContextError ? (
          <div className="border rounded-md p-4 text-center bg-gray-50">
            <p className="text-gray-500">No projects available.</p>
            <button
              className="mt-2 text-blue-600 text-sm hover:underline"
              onClick={() => setShowNewProjectForm(true)}
            >
              Create your first project
            </button>
          </div>
        ) : (
          <>
            {/* Option for "No Project" */}
            <div
              className={`border rounded-md p-3 flex items-center cursor-pointer ${activeProject === null ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
              onClick={() => selectProject(null)}
            >
              <div className={`h-5 w-5 mr-3 flex items-center justify-center rounded-full ${activeProject === null ? 'bg-blue-500 text-white' : 'border border-gray-400'}`}>
                {activeProject === null && <Check size={12} />}
              </div>
              <div>
                <p className="font-medium">No Project</p>
                <p className="text-xs text-gray-500">Work with personal data only</p>
              </div>
            </div>

            {/* List existing projects */}
            {projects.map(project => (
              <div
                key={project.id}
                className={`border rounded-md p-3 flex items-center cursor-pointer ${activeProject?.id === project.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                onClick={() => selectProject(project)} // Pass the whole project object
              >
                <div className={`h-5 w-5 mr-3 flex items-center justify-center rounded-full ${activeProject?.id === project.id ? 'bg-blue-500 text-white' : 'border border-gray-400'}`}>
                  {activeProject?.id === project.id && <Check size={12} />}
                </div>
                <div>
                  <p className="font-medium">{project.title}</p>
                  {project.description && (
                    <p className="text-xs text-gray-500 truncate" title={project.description}>{project.description}</p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectSelection;