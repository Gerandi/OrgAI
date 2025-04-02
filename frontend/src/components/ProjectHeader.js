import React from 'react';
import { useProject } from '../contexts/ProjectContext';

const ProjectHeader = () => {
  const { activeProject } = useProject();

  // Only show the header when a project is selected
  if (!activeProject) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-100 px-4 py-1">
      <div className="text-sm text-blue-700 font-medium truncate">
        Project: {activeProject.title}
      </div>
    </div>
  );
};

export default ProjectHeader;