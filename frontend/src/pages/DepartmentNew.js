import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, Building, Save, ArrowLeft } from 'lucide-react';
import profileService from '../services/profile'; // Assuming profile service exists

const DepartmentNew = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const preselectedOrgId = queryParams.get('org');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organization_id: preselectedOrgId || '',
    parent_department_id: ''
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [departments, setDepartments] = useState([]); // For parent department dropdown

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (formData.organization_id) {
      fetchDepartments(formData.organization_id);
    } else {
      setDepartments([]); // Clear departments if no org is selected
    }
  }, [formData.organization_id]);

  const fetchOrganizations = async () => {
    try {
      const response = await profileService.getUserOrganizations();
      setOrganizations(response.data || []);

      // If no preselected org but user has orgs, select the first one
      if (!preselectedOrgId && response.data?.length > 0 && !formData.organization_id) {
        setFormData(prev => ({
          ...prev,
          organization_id: response.data[0].id
        }));
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchDepartments = async (orgId) => {
    try {
      const response = await profileService.getOrganizationDepartments(orgId);
      setDepartments(response.data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setDepartments([]);
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
    setIsSubmitting(true);

    // Convert string IDs to numbers or null
    const submitData = {
      ...formData,
      organization_id: formData.organization_id ? parseInt(formData.organization_id) : null,
      parent_department_id: formData.parent_department_id ? parseInt(formData.parent_department_id) : null
    };

    if (!submitData.organization_id) {
        setError("Please select an organization.");
        setIsSubmitting(false);
        return;
    }

    try {
      const response = await profileService.createDepartment(submitData); // Use profileService
      navigate(`/departments/${response.data.id}`); // Navigate to the new department detail page
    } catch (err) {
      console.error('Error creating department:', err);
      setError(err.response?.data?.detail || 'Failed to create department');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)} // Go back
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>

      <div className="flex items-center mb-6">
        <div className="bg-purple-100 p-2 rounded-full mr-4">
          <Briefcase className="w-6 h-6 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold">Create New Department</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {organizations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations Found</h3>
          <p className="text-gray-500 mb-4">You need to be part of an organization to create a department.</p>
          <button
            onClick={() => navigate('/organizations/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Organization
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="organization_id">
                Organization*
              </label>
              <select
                id="organization_id"
                name="organization_id"
                value={formData.organization_id || ''}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Select an organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Department Name*
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
                placeholder="Provide a brief description of this department's purpose and responsibilities"
              />
            </div>

            {departments.length > 0 && (
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="parent_department_id">
                  Parent Department (Optional)
                </label>
                <select
                  id="parent_department_id"
                  name="parent_department_id"
                  value={formData.parent_department_id || ''}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">No parent department</option>
                  {departments.map(dept => (
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
                onClick={() => navigate(-1)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.organization_id} // Disable if no org selected
                className={`flex items-center bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isSubmitting || !formData.organization_id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DepartmentNew;