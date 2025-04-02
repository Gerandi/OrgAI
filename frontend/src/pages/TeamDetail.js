import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, User, Building, ChevronRight, Edit, UserPlus, PieChart, BarChart2, Trash2 } from 'lucide-react'; // Added Trash2
import api from '../services/api';
import profileService from '../services/profile'; // Assuming profile service exists

const TeamDetail = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    team_lead_id: '',
    department_id: ''
  });
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [canEdit, setCanEdit] = useState(false); // To check if user can edit team
  const [departments, setDepartments] = useState([]); // For dropdown in edit mode
  const [orgEmployees, setOrgEmployees] = useState([]); // For team lead dropdown
  const [confirmDelete, setConfirmDelete] = useState(false); // For delete confirmation

  useEffect(() => {
    fetchTeamData();
  }, [teamId]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      // Fetch team details
      const teamResponse = await profileService.getTeamDetail(teamId);
      setTeam(teamResponse.data);
      setFormData({
        name: teamResponse.data.name || '',
        description: teamResponse.data.description || '',
        team_lead_id: teamResponse.data.team_lead_id || '',
        department_id: teamResponse.data.department_id || ''
      });

      // Fetch organization details and check permissions
      if (teamResponse.data.organization_id) {
        try {
          const orgResponse = await profileService.getOrganizationDetail(teamResponse.data.organization_id);
          setOrganization(orgResponse.data);
          setCanEdit(['owner', 'admin'].includes(orgResponse.data.user_role)); // Check if user is org admin/owner

          // Fetch departments for the organization (for edit dropdown)
          const deptsResponse = await profileService.getOrganizationDepartments(teamResponse.data.organization_id);
          setDepartments(deptsResponse.data);

          // Fetch all employees in the organization (for team lead dropdown)
          const allEmployeesResponse = await profileService.getEmployees({ organization_id: teamResponse.data.organization_id });
          setOrgEmployees(allEmployeesResponse.data);

        } catch (err) {
          console.error('Error fetching organization or related data:', err);
        }
      }

      // Fetch team employees
      try {
        const employeesResponse = await profileService.getTeamEmployees(teamId);
        setEmployees(employeesResponse.data);
      } catch (err) {
        console.error('Error fetching employees:', err);
        setEmployees([]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === "" ? null : value // Handle empty string for optional fields
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    try {
      await profileService.updateTeam(teamId, formData);
      setSuccess('Team updated successfully');
      setIsEditing(false);
      fetchTeamData(); // Refresh data
    } catch (err) {
      console.error('Error updating team:', err);
      setError(err.response?.data?.detail || 'Failed to update team');
    }
  };

  const handleDelete = async () => {
    try {
      await profileService.deleteTeam(teamId);
      navigate(`/organizations/${team.organization_id}`); // Navigate back to org page
    } catch (err) {
      console.error('Error deleting team:', err);
      setError(err.response?.data?.detail || 'Failed to delete team');
      setConfirmDelete(false);
    }
  };

  const handleRemoveEmployee = async (employeeId) => {
     try {
        await profileService.removeTeamEmployee(teamId, employeeId);
        setSuccess('Employee removed successfully');
        fetchTeamData(); // Refresh data
     } catch (err) {
        console.error('Error removing employee:', err);
        setError(err.response?.data?.detail || 'Failed to remove employee');
     }
  };

  const navigateToOrganization = (orgId) => {
    navigate(`/organizations/${orgId}`);
  };

   const navigateToEmployee = (employeeId) => {
    // Assuming an employee detail page exists or should be created
    // navigate(`/employees/${employeeId}`);
    console.log("Navigate to employee detail page for ID:", employeeId); // Placeholder
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="loader">Loading...</div> {/* Replace with actual Loading component */}
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate(-1)} // Go back
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Back
        </button>
      </div>
    );
  }

  // Ensure team is loaded before rendering
  if (!team) return null;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <div className="bg-green-100 p-2 rounded-full mr-4">
          <Users className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <div className="flex items-center text-gray-500">
            {organization && (
              <>
                <button
                  onClick={() => navigateToOrganization(organization.id)}
                  className="hover:text-blue-600 hover:underline"
                >
                  {organization.name}
                </button>
                <ChevronRight className="w-4 h-4 mx-1" />
              </>
            )}
            <span>Team</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span>ID: {team.id}</span>
          </div>
        </div>
        <div className="ml-auto flex space-x-2">
            {canEdit && (
                <>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        {isEditing ? 'Cancel Edit' : 'Edit Team'}
                    </button>
                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </button>
                </>
            )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

       {/* Confirmation dialog */}
       {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete this team? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Delete Team
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'overview'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('overview')}
        >
          <div className="flex items-center">
            <Users size={16} className="mr-2" />
            Overview
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'members'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('members')}
        >
          <div className="flex items-center">
            <User size={16} className="mr-2" />
            Members ({employees.length})
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'performance'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('performance')}
        >
          <div className="flex items-center">
            <BarChart2 size={16} className="mr-2" />
            Performance
          </div>
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Team Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
                />
              </div>

              {departments.length > 0 && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="department_id">
                    Department
                  </label>
                  <select
                    id="department_id"
                    name="department_id"
                    value={formData.department_id || ''}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="">-- No Department --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {orgEmployees.length > 0 && (
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="team_lead_id">
                    Team Lead
                  </label>
                  <select
                    id="team_lead_id"
                    name="team_lead_id"
                    value={formData.team_lead_id || ''}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="">-- No Team Lead --</option>
                    {orgEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Team Information</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Name</h4>
                      <p>{team.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Description</h4>
                      <p className="whitespace-pre-line">{team.description || 'No description provided'}</p>
                    </div>
                    {organization && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Organization</h4>
                        <p>{organization.name}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Department</h4>
                      <p>{departments.find(d => d.id === team.department_id)?.name || 'No department assigned'}</p>
                    </div>
                     <div>
                      <h4 className="text-sm font-medium text-gray-500">Team Lead</h4>
                      <p>{orgEmployees.find(e => e.id === team.team_lead_id)?.name || 'Not assigned'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Created</h4>
                      <p>{new Date(team.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Team Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center p-4 bg-gray-50 rounded-md">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{team.team_size || 0}</p>
                        <p className="text-gray-500">Team Members</p>
                      </div>
                    </div>

                    {team.performance_score !== null && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Performance Score</h4>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${Math.round((team.performance_score || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((team.performance_score || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {team.innovation_score !== null && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Innovation Score</h4>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className="bg-green-600 h-2.5 rounded-full"
                              style={{ width: `${Math.round((team.innovation_score || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((team.innovation_score || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {team.communication_score !== null && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Communication Score</h4>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className="bg-purple-600 h-2.5 rounded-full"
                              style={{ width: `${Math.round((team.communication_score || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((team.communication_score || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Team Members</h2>
            {canEdit && (
              <button
                onClick={() => navigate(`/employees/new?team=${teamId}&org=${team.organization_id}`)} // Link to add employee page
                className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Employee
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenure
                  </th>
                  {canEdit && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.length > 0 ? (
                  employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {employee.name?.charAt(0) || 'E'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          </div>
                          {team.team_lead_id === employee.id && (
                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              Team Lead
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.role || 'No Role'}</div>
                        <div className="text-xs text-gray-500">Level: {employee.level || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {employee.performance_score !== null ? (
                          <div className="flex items-center">
                            <div className="mr-2 w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.round((employee.performance_score || 0) * 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-500">
                              {Math.round((employee.performance_score || 0) * 100)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Not rated</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.tenure_months ? `${employee.tenure_months} months` : 'N/A'}
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                             <button
                                onClick={() => handleRemoveEmployee(employee.id)}
                                className="text-red-600 hover:text-red-900"
                             >
                                Remove
                             </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                      No team members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Team Performance Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Performance</div>
                <div className="text-2xl font-bold">{Math.round((team.performance_score || 0) * 100)}%</div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.round((team.performance_score || 0) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Innovation</div>
                <div className="text-2xl font-bold">{Math.round((team.innovation_score || 0) * 100)}%</div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${Math.round((team.innovation_score || 0) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Communication</div>
                <div className="text-2xl font-bold">{Math.round((team.communication_score || 0) * 100)}%</div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${Math.round((team.communication_score || 0) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Performance Breakdown</h3>
            <div className="text-center text-gray-500 p-8">
              <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Performance analytics visualization would go here.</p>
              <p className="text-sm mt-2">This feature is under development.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetail;