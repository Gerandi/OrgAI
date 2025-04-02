import React, { useState, useEffect } from 'react';
import { Clock, Upload, Users, BarChart2, FileText } from 'lucide-react'; // Use Clock instead of ClockIcon
import api from '../../services/api';

const ProjectActivity = ({ project }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, [project?.id]); // Refetch when project ID changes

  const fetchActivities = async () => {
    if (!project?.id) {
        setLoading(false);
        setActivities([]); // Clear activities if no project ID
        return;
    }

    try {
      setLoading(true);
      setError(null);
      // Fetch real activities from the backend endpoint
      // Assuming the endpoint is /activities/project/{project_id} based on previous context
      const response = await api.get(`/activities/project/${project.id}`);
      console.log('Activities loaded:', response.data);
      setActivities(response.data || []); // Ensure activities is always an array
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load project activity');
      setActivities([]); // Clear activities on error
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'dataset': return Upload;
      case 'team': return Users; // Assuming 'team' type for member additions
      case 'model': return BarChart2;
      case 'publication': return FileText;
      default: return Clock; // Default icon
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'dataset':
        return `uploaded dataset "${activity.item}"`;
      case 'team': // Assuming 'team' type for member additions
        return `added ${activity.item_full_name || activity.item} to the project team`;
      case 'model':
        return `created model "${activity.item}"`;
      case 'publication':
        return `added publication "${activity.item}"`;
      default:
        return `updated ${activity.type} "${activity.item}"`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-500">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-2">Recent Activity</h3>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity) => {
            const ActivityIcon = getActivityIcon(activity.type);
            return (
              <div key={activity.id} className="flex p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <ActivityIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-grow">
                  <div className="text-sm font-medium">{activity.user_full_name || activity.user}</div>
                  <div className="text-sm text-gray-600">
                    {getActivityText(activity)}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center mt-1">
                    <Clock className="h-3 w-3 mr-1" /> {formatRelativeTime(activity.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-500">No recent activity recorded.</p>
          <p className="text-sm text-gray-400 mt-1">Activities will appear here as you and your team work on this project.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectActivity;