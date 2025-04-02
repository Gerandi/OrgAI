import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, FileText, BarChart2, Settings, PlayCircle, Plus, ArrowLeft } from 'lucide-react';
import ProjectActivity from '../components/research/ProjectActivity';
import api from '../services/api';
import { useProject } from '../contexts/ProjectContext';

// Project components
import AddMemberModal from '../components/research/AddMemberModal';
import DatasetList from '../components/research/DatasetList';
import UploadDatasetModal from '../components/research/UploadDatasetModal';
import ModelList from '../components/research/ModelList';
import CreateModelModal from '../components/research/CreateModelModal';
import PublicationList from '../components/research/PublicationList';
import AddPublicationModal from '../components/research/AddPublicationModal';
import ProjectSettingsModal from '../components/research/ProjectSettingsModal';

const ProjectDetail = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { activeProject, updateProject } = useProject();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Modal states
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [isUploadDatasetModalOpen, setIsUploadDatasetModalOpen] = useState(false);
    const [isCreateModelModalOpen, setIsCreateModelModalOpen] = useState(false);
    const [isAddPublicationModalOpen, setIsAddPublicationModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    useEffect(() => {
        fetchProject();
    }, [projectId]);

    // If the active project was updated, update the local project state
    useEffect(() => {
        if (activeProject && activeProject.id === parseInt(projectId)) {
            setProject(activeProject);
        }
    }, [activeProject, projectId]);

    const fetchProject = async () => {
        try {
            setLoading(true);
            console.log(`Fetching project details for ID: ${projectId}`);
            const response = await api.get(`/research/projects/${projectId}`);
            console.log('Project details received:', response.data);
            setProject(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching project:', err);
            setError(err.response?.data?.detail || 'Failed to fetch project details');
        } finally {
            setLoading(false);
        }
    };

    const handleMemberAdded = (newMember) => {
        setProject(prev => ({
            ...prev,
            team: [...(prev.team || []), newMember]
        }));
    };

    const handleDatasetUploaded = () => {
        // If we're on the datasets tab, refresh the project data
        if (activeTab === 'datasets') {
            fetchProject();
        }
    };

    const handleModelCreated = () => {
        // If we're on the models tab, refresh the project data
        if (activeTab === 'models') {
            fetchProject();
        }
    };

    const handlePublicationAdded = () => {
        // If we're on the publications tab, refresh the project data
        if (activeTab === 'publications') {
            fetchProject();
        }
    };

    const handleProjectUpdated = (updatedProject) => {
        setProject(updatedProject);
        updateProject(updatedProject);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-xl text-gray-500">Loading project details...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex flex-col">
                    <p className="text-red-700">{error}</p>
                    <button
                        onClick={() => navigate('/research')}
                        className="text-blue-600 hover:text-blue-800 mt-2"
                    >
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    if (!project) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center mb-4">
                <button
                    onClick={() => navigate('/research')}
                    className="text-gray-500 hover:text-gray-700 flex items-center mr-4"
                >
                    <ArrowLeft size={16} className="mr-1" /> Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900 flex-grow">{project.title}</h1>
                <div className="space-x-2">
                    <button
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded flex items-center"
                    >
                        <Settings size={16} className="mr-1" /> Settings
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                            project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                            {project.status}
                        </span>
                        <span className="text-sm text-gray-500 ml-4">
                            Visibility: {project.visibility || 'private'}
                        </span>
                    </div>

                    <p className="text-gray-700 mb-6">{project.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="font-semibold text-2xl text-blue-600">{project.team?.length || 0}</div>
                            <div className="text-sm text-gray-500">Team Members</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="font-semibold text-2xl text-blue-600">{project.resources?.datasets_count || 0}</div>
                            <div className="text-sm text-gray-500">Datasets</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="font-semibold text-2xl text-blue-600">{project.resources?.models_count || 0}</div>
                            <div className="text-sm text-gray-500">Models</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="font-semibold text-2xl text-blue-600">{project.resources?.publications_count || 0}</div>
                            <div className="text-sm text-gray-500">Publications</div>
                        </div>
                    </div>

                    <div className="border-b border-gray-200 mb-6">
                        <nav className="flex -mb-px">
                            <button
                                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                                    activeTab === 'overview'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('overview')}
                            >
                                Overview
                            </button>
                            <button
                                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                                    activeTab === 'team'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('team')}
                            >
                                Team
                            </button>
                            <button
                                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                                    activeTab === 'datasets'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('datasets')}
                            >
                                Datasets
                            </button>
                            <button
                                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                                    activeTab === 'models'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('models')}
                            >
                                Models
                            </button>
                            <button
                                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                                    activeTab === 'publications'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('publications')}
                            >
                                Publications
                            </button>
                        </nav>
                    </div>

                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Project Summary</h3>
                                <p className="text-gray-700">
                                    {project.description || 'No project summary available.'}
                                </p>
                            </div>

                            <ProjectActivity project={project} />
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Team Members</h3>
                                {(project.user_role === 'owner' || project.user_role === 'admin') && (
                                    <button
                                        className="px-3 py-1 bg-blue-600 text-white rounded flex items-center"
                                        onClick={() => setIsAddMemberModalOpen(true)}
                                    >
                                        <Plus size={16} className="mr-1" /> Add Member
                                    </button>
                                )}
                            </div>

                            {project.team && project.team.length > 0 ? (
                                <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Member
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Role
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {project.team.map((member) => (
                                                <tr key={member.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                                <span className="text-gray-500 font-medium">
                                                                    {member.full_name ? member.full_name.charAt(0) : member.username.charAt(0)}
                                                                </span>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {member.full_name || member.username}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    @{member.username}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            member.role === 'owner'
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : member.role === 'admin'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {member.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        {(project.user_role === 'owner' ||
                                                            (project.user_role === 'admin' && member.role !== 'owner')) && (
                                                            <button className="text-blue-600 hover:text-blue-900">
                                                                Edit
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-500">No team members found.</p>
                                </div>
                            )}

                            {/* Add Member Modal */}
                            <AddMemberModal
                                isOpen={isAddMemberModalOpen}
                                onClose={() => setIsAddMemberModalOpen(false)}
                                projectId={project.id}
                                onMemberAdded={handleMemberAdded}
                            />
                        </div>
                    )}

                    {activeTab === 'datasets' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Datasets</h3>
                                <button
                                    className="px-3 py-1 bg-blue-600 text-white rounded flex items-center"
                                    onClick={() => setIsUploadDatasetModalOpen(true)}
                                >
                                    <Plus size={16} className="mr-1" /> Upload Dataset
                                </button>
                            </div>

                            <DatasetList
                                projectId={project.id}
                                onUploadClick={() => setIsUploadDatasetModalOpen(true)}
                            />

                            {/* Upload Dataset Modal */}
                            <UploadDatasetModal
                                isOpen={isUploadDatasetModalOpen}
                                onClose={() => setIsUploadDatasetModalOpen(false)}
                                projectId={project.id}
                                onDatasetUploaded={handleDatasetUploaded}
                            />
                        </div>
                    )}

                    {activeTab === 'models' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Models</h3>
                                <button
                                    className="px-3 py-1 bg-blue-600 text-white rounded flex items-center"
                                    onClick={() => setIsCreateModelModalOpen(true)}
                                >
                                    <Plus size={16} className="mr-1" /> Create Model
                                </button>
                            </div>

                            <ModelList
                                projectId={project.id}
                                onCreateClick={() => setIsCreateModelModalOpen(true)}
                            />

                            {/* Create Model Modal */}
                            <CreateModelModal
                                isOpen={isCreateModelModalOpen}
                                onClose={() => setIsCreateModelModalOpen(false)}
                                projectId={project.id}
                                onModelCreated={handleModelCreated}
                            />
                        </div>
                    )}

                    {activeTab === 'publications' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Publications</h3>
                                <button
                                    className="px-3 py-1 bg-blue-600 text-white rounded flex items-center"
                                    onClick={() => setIsAddPublicationModalOpen(true)}
                                >
                                    <Plus size={16} className="mr-1" /> Add Publication
                                </button>
                            </div>

                            <PublicationList
                                projectId={project.id}
                                onAddClick={() => setIsAddPublicationModalOpen(true)}
                            />

                            {/* Add Publication Modal */}
                            <AddPublicationModal
                                isOpen={isAddPublicationModalOpen}
                                onClose={() => setIsAddPublicationModalOpen(false)}
                                projectId={project.id}
                                onPublicationAdded={handlePublicationAdded}
                            />
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                        Created: {new Date(project.created_at).toLocaleDateString()} •
                        Last Updated: {new Date(project.updated_at).toLocaleDateString()} •
                        Project ID: {project.id}
                    </div>
                </div>
            </div>

            {/* Project Settings Modal */}
            <ProjectSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                project={project}
                onProjectUpdated={handleProjectUpdated}
            />
        </div>
    );
};

export default ProjectDetail;