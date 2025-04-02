import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { ChevronDown, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProjectDropdown = () => {
  const { activeProject, projects, selectProject } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get the display name for the dropdown
  const getDisplayName = () => {
    if (!activeProject) return "Select Project";
    return activeProject.title;
  };

  const goToProjects = () => {
    navigate('/projects');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
      >
        <span className="truncate">{getDisplayName()}</span>
        <ChevronDown size={16} className={`ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-full bg-gray-700 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
          <div className="py-1">
            {/* Option for "No Project" */}
            <button
              onClick={() => {
                selectProject(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm ${
                !activeProject 
                  ? 'bg-gray-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              No Project
            </button>

            {/* List of projects */}
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  selectProject(project);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm truncate ${
                  activeProject?.id === project.id
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                {project.title}
              </button>
            ))}

            {/* Option to go to projects page */}
            <button
              onClick={goToProjects}
              className="w-full flex items-center text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white border-t border-gray-600"
            >
              <FolderPlus size={14} className="mr-2" />
              Manage Projects
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDropdown;