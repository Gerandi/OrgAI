import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, UserCheck, Users, Building } from 'lucide-react';
import { useAuth } from '../services/auth';
import api from '../services/api'; // Keep this if used directly, like for updateUserProfile
import profileService from '../services/profile';
import OrganizationsList from '../components/ui/OrganizationsList';
import TeamsList from '../components/ui/TeamsList';

const ProfilePage = () => {
  const { user, loading: authLoading, logout } = useAuth(); // Assuming useAuth provides logout
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
  const [dataLoading, setDataLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.id) { // Make sure user object is populated
        fetchProfile();
        fetchOrganizations();
        fetchTeams();
    } else if (!authLoading) {
        // If auth is not loading but user is null, might indicate an issue or logged out state
        setDataLoading(false);
    }
  }, [user, authLoading]); // Depend on user and authLoading

  const fetchProfile = async () => {
    setDataLoading(true);
    try {
      // Use profileService if available, otherwise use api directly
      const response = await (profileService.getUserProfile ? profileService.getUserProfile() : api.get('/users/me'));
      setProfile(response.data);
      setFormData({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
        password: '',
        confirmPassword: ''
      });
      setError(null); // Clear previous errors on successful fetch
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile information');
      // If profile fetch fails (e.g., 401), log out the user
      if (err.response && err.response.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      // Consider setting dataLoading false after all fetches complete
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await profileService.getUserOrganizations();
      setOrganizations(response.data);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      // Don't set a general error message here, maybe log or show specific warning
    } finally {
      // Consider setting dataLoading false after all fetches complete
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await profileService.getUserTeams();
      setTeams(response.data);
    } catch (err) {
      console.error('Error fetching teams:', err);
      // Don't set a general error message here
    } finally {
      // Set loading false after all data fetches are initiated or completed
      setDataLoading(false);
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

      // Use profileService if available, otherwise use api directly
      await (profileService.updateUserProfile ? profileService.updateUserProfile(updateData) : api.put('/users/me', updateData));
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      await fetchProfile(); // Reload profile data to reflect changes
      // Clear password fields after successful update
      setFormData(prev => ({ ...prev, password: '', confirmPassword: ''}));
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  // Use authLoading OR dataLoading to show loading state
  if (authLoading || dataLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="loader">Loading...</div> {/* Replace with a proper spinner/loader component */}
      </div>
    );
  }

  // If not loading and no profile (could be due to error or not logged in)
  if (!profile) {
     return (
       <div className="container mx-auto px-4 py-6 text-center">
         <h1 className="text-2xl font-bold mb-6">My Profile</h1>
         <p className="text-red-600">{error || "Could not load profile data. Please try logging in again."}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Login
          </button>
       </div>
     );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        <button
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'profile'
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
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'organizations'
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
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'teams'
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

      {/* Profile Tab Content */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" role="alert">
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
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight bg-gray-100 cursor-not-allowed"
                  aria-readonly="true"
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
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                  New Password <span className="text-gray-500 text-xs">(leave blank to keep current)</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="new-password"
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
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="new-password"
                  disabled={!formData.password} // Disable if password field is empty
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                      setIsEditing(false);
                      setError(null); // Clear errors on cancel
                      // Reset form data to original profile values
                      setFormData({
                          full_name: profile.full_name || '',
                          email: profile.email || '',
                          password: '',
                          confirmPassword: ''
                      });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Edit Profile
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium text-gray-900">{profile.username}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <UserCheck className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium text-gray-900">{profile.full_name || <span className="italic text-gray-400">Not provided</span>}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{profile.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Organizations Tab Content */}
      {activeTab === 'organizations' && (
        <OrganizationsList organizations={organizations} />
      )}

      {/* Teams Tab Content */}
      {activeTab === 'teams' && (
        <TeamsList teams={teams} />
      )}
    </div>
  );
};

export default ProfilePage;