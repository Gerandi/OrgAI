import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Users, ChevronRight, PlusCircle } from 'lucide-react';

/**
 * A reusable component to display a list of organizations
 */
const OrganizationsList = ({ organizations, showActions = true, showCreateButton = true }) => {
  const navigate = useNavigate();

  if (!organizations || organizations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations Found</h3>
        <p className="text-gray-500 mb-4">You are not part of any organizations yet.</p>
        {showCreateButton && (
          <button
            onClick={() => navigate('/organizations/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Organization
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {organizations.map((org) => (
          <li key={org.id} className="hover:bg-gray-50">
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-2 mr-4">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600 truncate">{org.name}</p>
                    <p className="text-sm text-gray-500 truncate">{org.description || 'No description'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    org.role === 'owner'
                      ? 'bg-green-100 text-green-800'
                      : org.role === 'admin'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {org.role}
                  </span>
                  {showActions && (
                    <button
                      onClick={() => navigate(`/organizations/${org.id}`)}
                      className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none"
                      aria-label={`View details for ${org.name}`}
                    >
                      Details
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex sm:space-x-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="flex-shrink-0 mr-1 h-4 w-4 text-gray-400" />
                    <p>{org.teams_count || 0} teams</p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <Users className="flex-shrink-0 mr-1 h-4 w-4 text-gray-400" />
                    <p>{org.members_count || 0} members</p>
                  </div>
                </div>
                {org.industry && (
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>{org.industry}</p>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OrganizationsList;