import React from 'react'; 
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { useAuth } from './services/auth'; 
import { ProjectProvider } from './contexts/ProjectContext'; 

// Layout 
import MainLayout from './components/layout/MainLayout'; 

// Pages 
import Dashboard from './pages/Dashboard'; 
import SimulationPage from './pages/SimulationPage'; 
import DataImport from './pages/DataImport'; 
import NetworkAnalysis from './pages/NetworkAnalysis'; 
import ResearchProjects from './pages/ResearchProjects'; 
import ProjectDetail from './pages/ProjectDetail'; 
import ModelBuilder from './pages/ModelBuilder'; 
import Profile from './pages/Profile'; 
import OrganizationDetail from './pages/OrganizationDetail'; 
import OrganizationNew from './pages/OrganizationNew'; 
import TeamDetail from './pages/TeamDetail'; 
import TeamNew from './pages/TeamNew'; 
import DepartmentDetail from './pages/DepartmentDetail'; 
import DepartmentNew from './pages/DepartmentNew'; 
import Login from './pages/Login'; 
import Register from './pages/Register'; 
import NotFound from './pages/NotFound'; 

function App() { 
const { isAuthenticated, loading } = useAuth(); 

// Show loading indicator while auth state is being determined 
if (loading) { 
return ( 
<div className="flex items-center justify-center h-screen"> 
<div className="text-blue-600">Loading...</div> 
</div> 
); 
} 

return ( 
<Routes> 
{/* Public routes */} 
<Route path="/login" element={<Login />} /> 
<Route path="/register" element={<Register />} /> 

{/* Protected routes */} 
<Route 
path="/" 
element={ 
isAuthenticated ? ( 
<ProjectProvider> 
<MainLayout /> 
</ProjectProvider> 
) : ( 
<Navigate to="/login" replace /> 
) 
} 
> 
<Route index element={<Dashboard />} /> 
<Route path="simulation" element={<SimulationPage />} /> 
<Route path="data-import" element={<DataImport />} /> 
<Route path="network" element={<NetworkAnalysis />} /> 
<Route path="research" element={<ResearchProjects />} />
<Route path="projects" element={<ResearchProjects />} /> {/* Alias for research projects */} 
<Route path="research/:projectId" element={<ProjectDetail />} /> 
<Route path="model-builder" element={<ModelBuilder />} /> 
<Route path="profile" element={<Profile />} /> 
<Route path="organizations/new" element={<OrganizationNew />} /> 
<Route path="organizations/:orgId" element={<OrganizationDetail />} /> 
<Route path="teams/new" element={<TeamNew />} /> 
<Route path="teams/:teamId" element={<TeamDetail />} /> 
<Route path="departments/new" element={<DepartmentNew />} /> 
<Route path="departments/:deptId" element={<DepartmentDetail />} /> 
</Route> 

{/* 404 route */} 
<Route path="*" element={<NotFound />} /> 
</Routes> 
); 
} 

export default App;