import React, { useState, useEffect } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import profileService from '../../services/profile'; // Assuming profile service exists

const OrganizationProjectFilter = () => {
  const { activeOrgId, selectOrganization } = useProject();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true);
      try {
        const response = await profileService.getUserOrganizations();
        setOrganizations(response.data || []);
      } catch (err) {
        console.error('Error fetching organizations for filter:', err);
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  const handleOrgChange = (e) => {
    const orgId = e.target.value ? parseInt(e.target.value) : null;
    selectOrganization(orgId);
  };

  return (
    <div className="mb-4">
      <label htmlFor="org-filter" className="block text-sm font-medium text-gray-700 mb-1">
        Filter by Organization
      </label>
      <select
        id="org-filter"
        value={activeOrgId || ''}
        onChange={handleOrgChange}
        className="w-full border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        disabled={loading}
      >
        <option value="">All My Projects</option>
        {organizations.map(org => (
          <option key={org.id} value={org.id}>
            {org.name} (Role: {org.role})
          </option>
        ))}
      </select>
      {loading && <p className="text-xs text-gray-500 mt-1">Loading organizations...</p>}
    </div>
  );
};

export default OrganizationProjectFilter;