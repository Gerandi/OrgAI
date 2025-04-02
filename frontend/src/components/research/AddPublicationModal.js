import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';

const AddPublicationModal = ({ isOpen, onClose, projectId, onPublicationAdded }) => {
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    authors: '',
    publication_type: 'conference',
    venue: '',
    publication_date: '',
    doi: '',
    url: '',
    project_id: projectId // Ensure project_id is included
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
      // Ensure project_id is included when submitting
      const dataToSubmit = {
        ...formData,
        project_id: projectId
      };

      const response = await api.post('/research/publications', dataToSubmit);
      onPublicationAdded(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add publication');
      console.error('Error adding publication:', err);
    } finally {
      setLoading(false);
    }
  };

 return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">Add Publication</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

       {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 sticky top-[65px] z-10">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

       <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter publication title"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="authors" className="block text-sm font-medium text-gray-700 mb-1">
              Authors *
            </label>
            <input
              type="text"
              id="authors"
              name="authors"
              value={formData.authors}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Smith, J., Jones, A."
            />
          </div>

          <div className="mb-4">
            <label htmlFor="abstract" className="block text-sm font-medium text-gray-700 mb-1">
              Abstract
            </label>
            <textarea
              id="abstract"
              name="abstract"
              value={formData.abstract}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the publication"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="publication_type" className="block text-sm font-medium text-gray-700 mb-1">
              Publication Type
            </label>
            <select
              id="publication_type"
              name="publication_type"
              value={formData.publication_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="conference">Conference Paper</option>
              <option value="journal">Journal Article</option>
              <option value="preprint">Preprint</option>
              <option value="book">Book</option>
              <option value="book_chapter">Book Chapter</option>
              <option value="report">Technical Report</option>
              <option value="thesis">Thesis/Dissertation</option>
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-1">
              Venue
            </label>
            <input
              type="text"
              id="venue"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Journal name, Conference name"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="publication_date" className="block text-sm font-medium text-gray-700 mb-1">
              Publication Date
            </label>
            <input
              type="date"
              id="publication_date"
              name="publication_date"
              value={formData.publication_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="doi" className="block text-sm font-medium text-gray-700 mb-1">
                DOI
              </label>
              <input
                type="text"
                id="doi"
                name="doi"
                value={formData.doi}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 10.1234/abcd"
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
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
              {loading ? 'Adding...' : 'Add Publication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPublicationModal;