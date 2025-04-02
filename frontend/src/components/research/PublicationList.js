import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import api from '../../services/api';

const PublicationList = ({ projectId, onAddClick }) => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

 useEffect(() => {
    fetchPublications();
  }, [projectId]);

 const fetchPublications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/research/publications', {
        params: { project_id: projectId }
      });
      setPublications(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch publications');
      console.error('Error fetching publications:', err);
    } finally {
      setLoading(false);
    }
  };

 if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500">Loading publications...</div>
      </div>
    );
  }

 if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

 if (publications.length === 0) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg text-center">
        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500 mb-4">No publications have been added for this project yet.</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={onAddClick}
        >
          Add Your First Publication
        </button>
      </div>
    );
  }

 return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Authors
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Venue
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {publications.map((publication) => (
            <tr key={publication.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{publication.title}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {publication.authors}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {publication.publication_type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {publication.venue || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {publication.url && (
                  <a
                    href={publication.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                    title="View Publication"
                  >
                    <span className="mr-1">View</span>
                    <ExternalLink size={14} />
                  </a>
                )}
                 {/* Add Edit/Delete buttons later */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PublicationList;