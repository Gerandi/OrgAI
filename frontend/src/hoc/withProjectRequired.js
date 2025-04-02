import React from 'react';
import { useProject } from '../contexts/ProjectContext';
// Assuming ProjectSelection component exists in components directory
// If not, we might need to create it or adjust the import path.
// For now, let's assume it's in components/layout/ or just components/
import ProjectSelection from '../components/ProjectSelection'; // Adjust path if needed
import { Folder, AlertTriangle } from 'lucide-react'; // Added AlertTriangle

// Higher-order component to require active project
const withProjectRequired = (Component, options = {}) => {
  const { title = 'Project Required' } = options;

  return (props) => {
    const { activeProject, loading: projectLoading, error: projectError } = useProject();

    // Show loading indicator while project context is loading
    if (projectLoading) {
        return (
             <div className="flex justify-center items-center h-64">
                 <p className="text-gray-500">Loading project data...</p>
             </div>
        );
    }

    // Show error if project context failed to load
     if (projectError && !activeProject) { // Show error only if loading failed AND no project is active
         return (
             <div className="space-y-6 p-4">
                 <h1 className="text-2xl font-bold text-red-700">Error Loading Projects</h1>
                 <div className="bg-red-50 border-l-4 border-red-500 p-4">
                     <div className="flex">
                         <div className="flex-shrink-0">
                             <AlertTriangle className="h-5 w-5 text-red-400" />
                         </div>
                         <div className="ml-3">
                             <p className="text-sm text-red-700">
                                 Could not load project information. Please ensure the backend is running and accessible. Error: {projectError}
                             </p>
                         </div>
                     </div>
                 </div>
                  {/* Optionally show ProjectSelection even on error? */}
                  {/* <ProjectSelection /> */}
             </div>
         );
     }


    // If no project is selected, show project selection UI with warning
    if (!activeProject) {
      return (
        <div className="space-y-6 p-4 md:p-6"> {/* Added padding */}
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Folder className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You need to select or create a project to use this feature.
                </p>
              </div>
            </div>
          </div>

          {/* Render the ProjectSelection component */}
          <ProjectSelection />

          {/* Placeholder for the disabled content */}
          <div className="bg-white rounded-lg shadow p-6 text-center opacity-50">
            <div className="p-10 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">Select or create a project above to enable this feature.</p>
            </div>
          </div>
        </div>
      );
    }

    // If project is selected, render the wrapped component
    return <Component {...props} />;
  };
};

export default withProjectRequired;