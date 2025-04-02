import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, Users, Building, ChevronRight, Edit, Trash2, PlusCircle, UserPlus } from 'lucide-react';
import profileService from '../services/profile'; // Assuming profile service exists

const DepartmentDetail = () => {
  const { deptId } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_department_id: ''
  });
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [canEdit, setCanEdit] = useState(false); // To check if user can edit
  const [parentDepartments, setParentDepartments] = useState([]); // For dropdown in edit mode
  const [confirmDelete, setConfirmDelete] = useState(false); // For delete confirmation

  useEffect(() => {
    fetchDepartmentData();
  }, [deptId]);

  const fetchDepartmentData = async () => {
    setLoading(true);
    try {
      // Fetch department details
      const deptResponse = await profileService.getDepartmentDetail(deptId);
      setDepartment(deptResponse.data);
      setFormData({
        name: deptResponse.data.name || '',
        description: deptResponse.data.description || '',
        parent_department_id: deptResponse.data.parent_department_id || ''
      });

      // Fetch organization details and check permissions
      if (deptResponse.data.organization_id) {
        try {
          const orgResponse = await profileService.getOrganizationDetail(deptResponse.data.organization_id);
          setOrganization(orgResponse.data);
          setCanEdit(['owner', 'admin'].includes(orgResponse.data.user_role)); // Check if user is org admin/owner

          // Fetch potential parent departments (excluding itself)
          const deptsResponse = await profileService.getOrganizationDepartments(deptResponse.data.organization_id);
          setParentDepartments(deptsResponse.data.filter(d => d.id !== parseInt(deptId)));
        } catch (err) {
          console.error('Error fetching organization or related data:', err);
        }
      }

      // Fetch department employees
      try {
        const employeesResponse = await profileService.getDepartmentEmployees(deptId);
        setEmployees(employeesResponse.data);
      } catch (err) {
        console.error('Error fetching employees:', err);
        setEmployees([]);
      }

      // Fetch department teams
      try {
        const teamsResponse = await profileService.getDepartmentTeams(deptId);
        setTeams(teamsResponse.data);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setTeams([]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching department data:', err);
      setError('Failed to load department data');
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
      await profileService.updateDepartment(deptId, formData);
      setSuccess('Department updated successfully');
      setIsEditing(false);
      fetchDepartmentData(); // Refresh data
    } catch (err) {
      console.error('Error updating department:', err);
      setError(err.response?.data?.detail || 'Failed to update department');
    }
  };

  const handleDelete = async () => {
    try {
      await profileService.deleteDepartment(deptId);
      navigate(`/organizations/${department.organization_id}`); // Navigate back to org page
    } catch (err) {
      console.error('Error deleting department:', err);
      setError(err.response?.data?.detail || 'Failed to delete department');
      setConfirmDelete(false);
    }
  };

  const navigateToOrganization = (orgId) => {
    navigate(`/organizations/${orgId}`);
  };

  const navigateToTeam = (teamId) => {
    navigate(`/teams/${teamId}`);
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

  if (error && !department) {
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

  // Ensure department is loaded before rendering
  if (!department) return null;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <div className="bg-purple-100 p-2 rounded-full mr-4">
          <Briefcase className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{department.name}</h1>
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
            <span>Department</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span>ID: {department.id}</span>
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
                        {isEditing ? 'Cancel Edit' : 'Edit Department'}
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
            <p className="mb-6">Are you sure you want to delete this department? This action cannot be undone.</p>
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
                Delete Department
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
            <Briefcase size={16} className="mr-2" />
            Overview
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'teams'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('teams')}
        >
          <div className="flex items-center">
            <Users size={16} className="mr-2" />
            Teams ({teams.length})
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'employees'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('employees')}
        >
          <div className="flex items-center">
            <Users size={16} className="mr-2" />
            Employees ({employees.length})
          </div>
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Department Name
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

              {parentDepartments.length > 0 && (
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="parent_department_id">
                    Parent Department
                  </label>
                  <select
                    id="parent_department_id"
                    name="parent_department_id"
                    value={formData.parent_department_id || ''}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="">-- No Parent Department --</option>
                    {parentDepartments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
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
                  <h3 className="text-lg font-semibold mb-4">Department Information</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Name</h4>
                      <p>{department.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Description</h4>
                      <p className="whitespace-pre-line">{department.description || 'No description provided'}</p>
                    </div>
                    {organization && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Organization</h4>
                        <p>{organization.name}</p>
                      </div>
                    )}
                    {department.parent_department && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Parent Department</h4>
                        <p>{department.parent_department.name}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Created</h4>
                      <p>{new Date(department.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Department Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center p-4 bg-gray-50 rounded-md">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{department.employees_count || 0}</p>
                        <p className="text-gray-500">Employees</p>
                      </div>
                    </div>

                    <div className="flex items-center p-4 bg-gray-50 rounded-md">
                      <div className="bg-green-100 p-3 rounded-full mr-4">
                        <Briefcase className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{department.teams_count || 0}</p>
                        <p className="text-gray-500">Teams</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Teams in this Department</h2>
            {canEdit && (
              <button
                onClick={() => navigate(`/teams/new?dept=${deptId}&org=${department.organization_id}`)}
                className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Team
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {teams.length > 0 ? (
              teams.map((team) => (
                <div key={team.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold">{team.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">{team.description || 'No description'}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm">{team.team_size || 0} team members</span>
                    </div>

                    {team.performance_score && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Performance</span>
                          <span>{Math.round(team.performance_score * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${Math.round(team.performance_score * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => navigateToTeam(team.id)}
                      className="w-full mt-2 text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      View Team
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No teams have been created in this department yet.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Department Employees</h2>
            {canEdit && (
              <button
                onClick={() => navigate(`/employees/new?dept=${deptId}&org=${department.organization_id}`)}
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
                    Team
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
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.role || 'No Role'}</div>
                        <div className="text-xs text-gray-500">Level: {employee.level || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.team ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {employee.team} {/* Assuming team name is available */}
                          </span>
                        ) : (
                          'Not assigned'
                        )}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => navigateToEmployee(employee.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="px-6 py-4 text-center text-gray-500">
                      No employees in this department yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDetail;