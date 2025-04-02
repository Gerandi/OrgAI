import React, { useState, useEffect } from 'react';
import { Plus, BarChart2, Download, PlayCircle } from 'lucide-react';
import api from '../../services/api';

const ModelList = ({ projectId, onCreateClick }) => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchModels();
    }, [projectId]);

    const fetchModels = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/models`, {
                params: { project_id: projectId }
            });
            console.log('Models loaded:', response.data);
            setModels(response.data || []);
        } catch (err) {
            console.error('Error fetching models:', err);
            setError('Failed to load models');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-24">
                <div className="text-gray-500">Loading models...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                    <div>
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {models.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {models.map((model) => (
                        <div key={model.id} className="border rounded-lg p-4 bg-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-medium">{model.name}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{model.model_type} • v{model.version}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button className="text-blue-600 hover:text-blue-800">
                                        <Download size={18} />
                                    </button>
                                    <button className="text-green-600 hover:text-green-800">
                                        <PlayCircle size={18} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm mt-2 text-gray-700">{model.description || 'No description'}</p>

                            {model.accuracy && (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    <div className="bg-blue-50 p-2 rounded text-center">
                                        <div className="text-xs text-gray-500">Accuracy</div>
                                        <div className="font-semibold">{(model.accuracy * 100).toFixed(1)}%</div>
                                    </div>
                                    <div className="bg-blue-50 p-2 rounded text-center">
                                        <div className="text-xs text-gray-500">Precision</div>
                                        <div className="font-semibold">{(model.precision * 100).toFixed(1)}%</div>
                                    </div>
                                    <div className="bg-blue-50 p-2 rounded text-center">
                                        <div className="text-xs text-gray-500">Recall</div>
                                        <div className="font-semibold">{(model.recall * 100).toFixed(1)}%</div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 pt-2 border-t text-xs text-gray-500">
                                Created: {new Date(model.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No models</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a model for this project.</p>
                    <div className="mt-6">
                        <button
                            onClick={onCreateClick}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                        >
                            <Plus className="-ml-1 mr-2 h-5 w-5" />
                            Create Model
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelList;