import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { BarChart2, PlayCircle, Network, Upload, FileText, Settings, LogOut, Menu, X, User } from 'lucide-react'; // Added User icon
import { useAuth } from '../../services/auth';
import { useProject } from '../../contexts/ProjectContext';
import ProjectSelection from '../ProjectSelection'; // Import the ProjectSelection component

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { error: projectError } = useProject(); // Only need error from project context here
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Log project context errors if they occur
  useEffect(() => {
    if (projectError) {
      console.error('Project context error in MainLayout:', projectError);
    }
  }, [projectError]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', to: '/', icon: BarChart2 },
    { name: 'Simulation', to: '/simulation', icon: PlayCircle },
    { name: 'Network Analysis', to: '/network', icon: Network },
    { name: 'Data Import', to: '/data-import', icon: Upload },
    { name: 'Research Projects', to: '/research', icon: FileText },
    { name: 'Model Builder', to: '/model-builder', icon: Settings },
    // Profile link removed from main nav as requested in Chat 9
  ];

  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
          isActive
            ? 'bg-gray-900 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`
      }
      onClick={() => setMobileMenuOpen(false)} // Close mobile menu on navigation
    >
      <item.icon className="mr-3 h-5 w-5" />
      {item.name}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile menu button */}
      <div className="bg-gray-800 lg:hidden">
        <div className="flex items-center justify-between p-2">
          <button
            type="button"
            className="text-gray-400 hover:text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="text-white font-semibold">OrgAI Platform</div>
          <div className="w-6" /> {/* Empty space for centering */}
        </div>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block lg:flex-shrink-0 bg-gray-800 lg:w-64 w-full absolute lg:relative z-10`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar header */}
            <div className="flex items-center justify-center h-16 px-4 bg-gray-900">
              <h1 className="text-white font-bold text-xl">OrgAI Platform</h1>
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4"> {/* Added pt-5 */}
              <nav className="flex-1 px-2 space-y-1">
                {navigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </nav>
            </div>

            {/* User menu */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-700">
                    <span className="text-sm font-medium leading-none text-white">
                      {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                    </span>
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    {user?.full_name || user?.username}
                  </p>
                  {/* Updated User Menu from Chat 9 */}
                  <div className="flex flex-col space-y-1 mt-1">
                     <button
                        onClick={() => navigate('/profile')}
                        className="flex items-center text-sm font-medium text-gray-300 hover:text-white"
                      >
                        <User className="mr-1 h-4 w-4" />
                        Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center text-sm font-medium text-gray-300 hover:text-white"
                      >
                        <LogOut className="mr-1 h-4 w-4" />
                        Logout
                      </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto flex flex-col"> {/* Added flex flex-col */}
           {/* Add ProjectSelection above the main content area */}
           <div className="p-4 md:px-6 md:pt-6 border-b bg-white shadow-sm sticky top-0 z-5"> {/* Make it sticky */}
               <ProjectSelection />
           </div>
          <main className="p-4 md:p-6 flex-grow"> {/* Added flex-grow */}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
