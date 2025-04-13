import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../../services/api';

const TrainingProgress = ({
  jobId, // Unique job ID for the training run
  progress,
  onComplete,
  status, // 'started', 'processing', 'completed', 'error'
  autoRefresh = true
}) => {
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastProgress, setLastProgress] = useState(progress || 0);
  const [lastStatus, setLastStatus] = useState(status || 'started');

  useEffect(() => {
    if (progress !== undefined) {
      setLastProgress(progress);
    }

    if (status !== undefined) {
      setLastStatus(status);
    }
  }, [progress, status]);

  useEffect(() => {
    // If we have a job ID and auto-refresh is enabled, periodically check status
    if (jobId && autoRefresh && lastStatus !== 'completed' && lastStatus !== 'error') {
      const interval = setInterval(() => {
        checkProgress();
      }, 3000); // Check every 3 seconds

      setRefreshInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else if (refreshInterval) {
        // Clear interval if status becomes completed or error, or if autoRefresh is disabled
        clearInterval(refreshInterval);
        setRefreshInterval(null);
    }
  }, [jobId, autoRefresh, lastStatus]); // Rerun effect if these change

  const checkProgress = async () => {
    if (!jobId) return;

    try {
      // Use the job_id in the API call
      const response = await api.get(`/models/training-progress/${jobId}`);

      if (response.data) {
        setLastProgress(response.data.progress || 0);
        setLastStatus(response.data.status || 'processing');

        if (response.data.status === 'completed' && onComplete) {
          onComplete(response.data); // Pass full progress data on completion
        }
        if (response.data.status === 'error' && onComplete) {
          // Also notify on error completion
          onComplete(response.data);
        }
      }
    } catch (error) {
      console.error('Error checking training progress:', error);
      // Optionally set status to error on API failure
      // setLastStatus('error');
    }
  };

  const getStatusColor = () => {
    switch (lastStatus) {
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'processing':
        return 'text-blue-500';
      default: // started or unknown
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (lastStatus) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
      case 'started':
      default:
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (lastStatus) {
      case 'completed':
        return 'Training complete';
      case 'error':
        return 'Error during training';
      case 'processing':
        return `Training in progress... ${Math.round(lastProgress)}%`;
      case 'started':
        return 'Preparing training job...';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center mb-2">
        {getStatusIcon()}
        <span className={`ml-2 text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ease-out ${
            lastStatus === 'error' ? 'bg-red-500' : 'bg-blue-600'
          }`}
          style={{ width: `${lastProgress}%` }}
        ></div>
      </div>

      {lastStatus === 'completed' && (
        <div className="mt-4 text-sm text-green-600">
          The model has been trained successfully and is ready to use!
        </div>
      )}

      {lastStatus === 'error' && (
        <div className="mt-4 text-sm text-red-600">
          An error occurred during training. Please check logs or try again.
        </div>
      )}
    </div>
  );
};

export default TrainingProgress;