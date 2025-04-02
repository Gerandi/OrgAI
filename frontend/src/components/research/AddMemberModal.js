import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';

const AddMemberModal = ({ isOpen, onClose, projectId, onMemberAdded }) => {
  const [formData, setFormData] = useState({
    username: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

 if (!isOpen) return null;

 const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

 const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

   try {
      const response = await api.post(`/research/projects/${projectId}/members`, formData);
      onMemberAdded(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add member');
      console.error('Error adding member:', err);
    } finally {
      setLoading(false);
    }
  };

 return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Add Team Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

       {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

       <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter username"
            />
          </div>

         <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Admin can add/remove members and manage datasets
            </p>
          </div>

         <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;