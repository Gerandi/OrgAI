import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useProject } from '../../contexts/ProjectContext'; // Import useProject

const ProjectSettingsModal = ({ isOpen, onClose, project, onProjectUpdated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const navigate = useNavigate();
  const { refreshProjects } = useProject(); // Get refresh function from context

  // Update form when project prop changes
  useEffect(() => {
    if (project) {
      setTitle(project.title || '');
      setDescription(project.description || '');
      setVisibility(project.visibility || 'private');
      setStatus(project.status || 'active');
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project) return;

    setLoading(true);
    setError(null);
    try {
      const updatedData = { title, description, visibility, status };
      const response = await api.put(`/research/projects/${project.id}`, updatedData);
      onProjectUpdated(response.data); // Notify parent
      onClose(); // Close modal
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err.response?.data?.detail || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.delete(`/research/projects/${project.id}`);
      refreshProjects(); // Refresh the project list in the context
      navigate('/research'); // Navigate back to projects list
      onClose(); // Close modal
    } catch (err) {
      console.error('Error deleting project:', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete project. Ensure you are the owner.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Project Settings</h3>

                {error && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Form fields */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" rows="3"></textarea>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                    <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="input-field">
                      <option value="private">Private</option>
                      <option value="organization">Organization</option>
                      <option value="public">Public</option>
                    </select>
                  </div>

                  {/* Save/Cancel Buttons */}
                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button type="submit" disabled={loading} className="btn btn-primary sm:ml-3">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={onClose} className="btn btn-secondary sm:mt-0">
                      Cancel
                    </button>
                  </div>
                </form>

                {/* Danger Zone */}
                <div className="border-t pt-4 mt-6">
                  <h4 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h4>
                  {showDeleteConfirm ? (
                    <div className="bg-red-50 p-4 rounded border border-red-200">
                      <p className="text-sm text-red-700 mb-4">
                        Are you sure you want to delete this project? This will permanently remove the project and all associated data (datasets, models, etc.). This action cannot be undone.
                      </p>
                      {deleteError && (
                        <div className="mb-4 bg-red-100 border-l-4 border-red-500 p-3">
                          <p className="text-sm text-red-700">{deleteError}</p>
                        </div>
                      )}
                      <div className="flex space-x-3">
                        <button type="button" onClick={handleDelete} disabled={deleteLoading} className="btn btn-danger">
                          {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn btn-danger-outline">
                      Delete Project
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Basic Input Field Style (replace with your actual styles or Tailwind classes)
const InputField = ({ ...props }) => (
  <input {...props} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2" />
);

// Basic Button Styles (replace with your actual styles or Tailwind classes)
const Button = ({ children, className = '', ...props }) => (
  <button {...props} className={`inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm ${className}`}>
    {children}
  </button>
);

const BtnPrimary = ({ children, ...props }) => (
  <Button {...props} className="border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500">
    {children}
  </Button>
);

const BtnSecondary = ({ children, ...props }) => (
  <Button {...props} className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500">
    {children}
  </Button>
);

const BtnDanger = ({ children, ...props }) => (
    <Button {...props} className="border-transparent bg-red-600 text-white hover:bg-red-700 focus:ring-red-500">
        {children}
    </Button>
);

const BtnDangerOutline = ({ children, ...props }) => (
    <Button {...props} className="border-red-600 bg-white text-red-600 hover:bg-red-50 focus:ring-red-500">
        {children}
    </Button>
);


// Add these styles to your global CSS or Tailwind config if needed:
// .input-field { /* styles */ }
// .btn { /* base button styles */ }
// .btn-primary { /* primary button styles */ }
// .btn-secondary { /* secondary button styles */ }
// .btn-danger { /* danger button styles */ }
// .btn-danger-outline { /* danger outline button styles */ }


export default ProjectSettingsModal;