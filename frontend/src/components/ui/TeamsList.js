import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, User, ChevronRight } from 'lucide-react';

/**
 * A reusable component to display a list of teams
 */
const TeamsList = ({ teams, showActions = true }) => {
  const navigate = useNavigate();

  if (!teams || teams.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Found</h3>
        <p className="text-gray-500 mb-4">There are no teams available to display.</p>
        {showActions && (
          <button
            onClick={() => navigate('/teams/new')} // Assuming a generic 'new team' route exists
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Team
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {teams.map((team) => (
          <li key={team.id} className="hover:bg-gray-50">
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-full p-2 mr-4">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600 truncate">{team.name}</p>
                    <p className="text-sm text-gray-500 truncate">{team.description || 'No description'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  {showActions && (
                    <button
                      onClick={() => navigate(`/teams/${team.id}`)}
                      className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none"
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
                    <User className="flex-shrink-0 mr-1 h-4 w-4 text-gray-400" />
                    <p>{team.employees_count || 0} members</p> {/* Use employees_count */}
                  </div>
                  {team.organization_name && (
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>Org: {team.organization_name}</p>
                    </div>
                  )}
                </div>

                {/* Performance indicator if available */}
                {team.performance_score !== null && team.performance_score !== undefined && (
                  <div className="mt-2 flex items-center sm:mt-0">
                    <div className="flex items-center">
                       <span className="text-xs text-gray-500 mr-1">Perf:</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.round(team.performance_score * 100)}%` }}
                          title={`Performance: ${Math.round(team.performance_score * 100)}%`}
                        />
                      </div>
                      <span className="text-sm text-gray-700">
                        {Math.round(team.performance_score * 100)}%
                      </span>
                    </div>
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

export default TeamsList;