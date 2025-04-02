import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, UserPlus, Briefcase, Building, ChevronRight, UserCheck, Edit, Trash2, PlusCircle, FileText } from 'lucide-react'; // Added FileText
import api from '../services/api';
import profileService from '../services/profile'; // Assuming profile service exists

const OrganizationDetail = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]); // Added state for projects
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry: '',
    size: ''
  });
  const [success, setSuccess] = useState(null);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    username: '',
    role: 'member'
  });

  useEffect(() => {
    fetchOrganizationData();
  }, [orgId]);

  const fetchOrganizationData = async () => {
    setLoading(true);
    try {
      // Fetch organization details
      const orgResponse = await profileService.getOrganizationDetail(orgId);
      setOrganization(orgResponse.data);
      setFormData({
        name: orgResponse.data.name || '',
        description: orgResponse.data.description || '',
        industry: orgResponse.data.industry || '',
        size: orgResponse.data.size || ''
      });

      // Fetch members
      try {
        const membersResponse = await profileService.getOrganizationMembers(orgId);
        setMembers(membersResponse.data);
      } catch (err) {
        console.error('Error fetching members:', err);
        setMembers([]);
      }

      // Fetch teams for this organization
      try {
        const teamsResponse = await profileService.getOrganizationTeams(orgId);
        setTeams(teamsResponse.data);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setTeams([]);
      }

      // Fetch departments for this organization
      try {
        const deptsResponse = await profileService.getOrganizationDepartments(orgId);
        setDepartments(deptsResponse.data);
      } catch (err) {
        console.error('Error fetching departments:', err);
        setDepartments([]);
      }

      // Fetch projects for this organization
      try {
        const projectsResponse = await api.get('/research/projects', { params: { organization_id: orgId } });
        setProjects(projectsResponse.data || []);
      } catch (err) {
        console.error('Error fetching projects for org:', err);
        setProjects([]);
      }


      setError(null);
    } catch (err) {
      console.error('Error fetching organization data:', err);
      setError('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    try {
      await profileService.updateOrganization(orgId, formData);
      setSuccess('Organization updated successfully');
      setIsEditing(false);
      fetchOrganizationData();
    } catch (err) {
      console.error('Error updating organization:', err);
      setError(err.response?.data?.detail || 'Failed to update organization');
    }
  };

  const handleNewMemberChange = (e) => {
    const { name, value } = e.target;
    setNewMemberData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    try {
      await profileService.addOrganizationMember(orgId, newMemberData);
      setSuccess('Member added successfully');
      setShowAddMemberForm(false);
      setNewMemberData({ username: '', role: 'member' });
      // Refresh members list
      try {
        const membersResponse = await profileService.getOrganizationMembers(orgId);
        setMembers(membersResponse.data);
      } catch (err) {
        console.error('Error fetching members:', err);
      }
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err.response?.data?.detail || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await profileService.removeOrganizationMember(orgId, userId);
      setSuccess('Member removed successfully');
      // Refresh members list
      const membersResponse = await profileService.getOrganizationMembers(orgId);
      setMembers(membersResponse.data);
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const navigateToTeam = (teamId) => {
    navigate(`/teams/${teamId}`);
  };

  const navigateToProject = (projectId) => {
    navigate(`/research/${projectId}`);
  };

  const navigateToDepartment = (deptId) => {
    navigate(`/departments/${deptId}`);
  };

  const handleCreateDepartment = () => {
    navigate(`/departments/new?org=${orgId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="loader">Loading...</div> {/* Replace with actual Loading component */}
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  // Ensure organization is loaded before rendering
  if (!organization) return null;

  const canEdit = ['owner', 'admin'].includes(organization.user_role);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <div className="bg-blue-100 p-2 rounded-full mr-4">
          <Building className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{organization.name}</h1>
          <div className="flex items-center text-gray-500">
            <span>Organization</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span>ID: {organization.id}</span>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="ml-auto bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditing ? 'Cancel Edit' : 'Edit Organization'}
          </button>
        )}
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

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'overview'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('overview')}
        >
          <div className="flex items-center">
            <Building size={16} className="mr-2" />
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
            <Users size={16} className="mr-2" />
            Members ({members.length})
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'teams'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('teams')}
        >
          <div className="flex items-center">
            <Briefcase size={16} className="mr-2" />
            Teams ({teams.length})
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'departments'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('departments')}
        >
          <div className="flex items-center">
            <Briefcase size={16} className="mr-2" /> {/* Consider a different icon */}
            Departments ({departments.length})
          </div>
        </button>
         <button
          className={`px-4 py-2 font-medium ${activeTab === 'projects'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('projects')}
        >
          <div className="flex items-center">
            <FileText size={16} className="mr-2" />
            Projects ({projects.length})
          </div>
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Organization Name
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

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="industry">
                  Industry
                </label>
                <input
                  id="industry"
                  name="industry"
                  type="text"
                  value={formData.industry}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="size">
                  Organization Size (number of employees)
                </label>
                <input
                  id="size"
                  name="size"
                  type="number"
                  min="1"
                  value={formData.size}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

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
                  <h3 className="text-lg font-semibold mb-4">Organization Information</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Name</h4>
                      <p>{organization.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Description</h4>
                      <p>{organization.description || 'No description provided'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Industry</h4>
                      <p>{organization.industry || 'Not specified'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Size</h4>
                      <p>{organization.size || 'Not specified'} employees</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Your Role</h4>
                      <p className="capitalize">{organization.user_role}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Organization Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center p-4 bg-gray-50 rounded-md">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{organization.employees_count || 0}</p>
                        <p className="text-gray-500">Employees</p>
                      </div>
                    </div>

                    <div className="flex items-center p-4 bg-gray-50 rounded-md">
                      <div className="bg-green-100 p-3 rounded-full mr-4">
                        <Briefcase className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{organization.teams_count || 0}</p>
                        <p className="text-gray-500">Teams</p>
                      </div>
                    </div>

                    <div className="flex items-center p-4 bg-gray-50 rounded-md">
                      <div className="bg-purple-100 p-3 rounded-full mr-4">
                        <Building className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{organization.departments_count || 0}</p>
                        <p className="text-gray-500">Departments</p>
                      </div>
                    </div>
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
            <h2 className="text-lg font-semibold">Organization Members</h2>
            {canEdit && (
              <button
                onClick={() => setShowAddMemberForm(!showAddMemberForm)}
                className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </button>
            )}
          </div>

          {showAddMemberForm && (
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="text-md font-semibold mb-3">Add New Member</h3>
              <form onSubmit={handleAddMember} className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={newMemberData.username}
                    onChange={handleNewMemberChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>

                <div className="w-40">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={newMemberData.role}
                    onChange={handleNewMemberChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    {organization.user_role === 'owner' && (
                      <option value="owner">Owner</option>
                    )}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberForm(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  {canEdit && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.length > 0 ? (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {member.full_name?.charAt(0) || member.username?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{member.full_name || 'Unnamed User'}</div>
                            <div className="text-sm text-gray-500">{member.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.role === 'owner'
                            ? 'bg-green-100 text-green-800'
                            : member.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'Unknown'}
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {/* Only show actions if current user is admin/owner and not for self or other owners */}
                          {(member.role !== 'owner' || organization.user_role === 'owner') &&
                           member.id !== Number(localStorage.getItem('userId')) && ( // Assuming userId is stored
                            <div className="flex space-x-2">
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                      No members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Teams</h2>
            {canEdit && (
              <button
                onClick={() => navigate(`/teams/new?org=${orgId}`)}
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
                No teams have been created yet.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Departments</h2>
            {canEdit && (
              <button
                onClick={handleCreateDepartment}
                className="bg-purple-500 hover:bg-purple-700 text-white text-sm font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Department
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {departments.length > 0 ? (
              departments.map((dept) => (
                <div key={dept.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold">{dept.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">{dept.description || 'No description'}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm">{dept.employees_count || 0} employees</span>
                    </div>

                    <div className="flex items-center mb-3">
                      <Briefcase className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm">{dept.teams_count || 0} teams</span>
                    </div>

                    <button
                      onClick={() => navigateToDepartment(dept.id)}
                      className="w-full mt-2 text-purple-600 hover:text-purple-900 text-sm font-medium"
                    >
                      View Department
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No departments have been created yet.
              </div>
            )}
          </div>
        </div>
      )}

       {activeTab === 'projects' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Research Projects</h2>
            {/* Add create project button if needed, linking to org */}
            <button
              onClick={() => navigate(`/research/new?org=${orgId}`)}
              className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Create Project
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {projects.length > 0 ? (
              projects.map((project) => (
                <div key={project.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateToProject(project.id)}>
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold">{project.title}</h3>
                     <span className={`text-xs px-2 py-0.5 rounded-full ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>{project.status}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">{project.description || 'No description'}</p>
                     <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{project.participant_count || 0} participants</span>
                        <span className="flex items-center text-blue-600 hover:text-blue-800">
                            Details <ChevronRight className="w-4 h-4 ml-1" />
                        </span>
                     </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No research projects associated with this organization yet.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default OrganizationDetail;