import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, UserCheck, Users, Building } from 'lucide-react';
import { useAuth } from '../services/auth';
import api from '../services/api';
import profileService from '../services/profile'; // Assuming profile service exists
import OrganizationsList from '../components/ui/OrganizationsList'; // Assuming component exists
import TeamsList from '../components/ui/TeamsList'; // Assuming component exists

const ProfilePage = () => {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeTab, setActiveTab] = useState('profile'); // profile, organizations, teams
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchOrganizations();
      fetchTeams();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setProfile(response.data);
      setFormData({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile information');
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await profileService.getUserOrganizations();
      setOrganizations(response.data);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await profileService.getUserTeams();
      setTeams(response.data);
    } catch (err) {
      console.error('Error fetching teams:', err);
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
    setError(null);
    setSuccess(null);

    // Validate passwords match
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const updateData = {
        full_name: formData.full_name,
        email: formData.email
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await api.put('/users/me', updateData);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      fetchProfile(); // Reload profile data
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  const navigateToOrganization = (orgId) => {
    navigate(`/organizations/${orgId}`);
  };

  const navigateToTeam = (teamId) => {
    navigate(`/teams/${teamId}`);
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="loader">Loading...</div> {/* Replace with actual Loading component if available */}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'profile'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('profile')}
        >
          <div className="flex items-center">
            <User size={16} className="mr-2" />
            Profile
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'organizations'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('organizations')}
        >
          <div className="flex items-center">
            <Building size={16} className="mr-2" />
            Organizations ({organizations.length})
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
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6">
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

          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={profile.username}
                  disabled
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight bg-gray-100"
                />
                <p className="text-gray-500 text-xs mt-1">Username cannot be changed</p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="full_name">
                  Full Name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                  New Password (leave blank to keep current)
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
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
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Edit Profile
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <User className="w-5 h-5 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">{profile.username}</p>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  <UserCheck className="w-5 h-5 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">{profile.full_name || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'organizations' && (
        <OrganizationsList organizations={organizations} />
      )}

      {activeTab === 'teams' && (
         <TeamsList teams={teams} />
      )}
    </div>
  );
};

export default ProfilePage;