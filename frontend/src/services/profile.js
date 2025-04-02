import api from './api';

/**
* Service for managing profile, organization, and team related operations
*/
export const profileService = {
  // Profile methods
  getUserProfile: () => {
    return api.get('/users/me');
  },

  updateUserProfile: (userData) => {
    return api.put('/users/me', userData);
  },

  // Organization methods
  getUserOrganizations: () => {
    return api.get('/users/me/organizations');
  },

  createOrganization: (data) => {
    return api.post('/organizations', data);
  },

  getOrganizationDetail: (orgId) => {
    return api.get(`/organizations/${orgId}`);
  },

  updateOrganization: (orgId, data) => {
    return api.put(`/organizations/${orgId}`, data);
  },

  deleteOrganization: (orgId) => {
    return api.delete(`/organizations/${orgId}`);
  },

  getOrganizationMembers: (orgId) => {
    return api.get(`/organizations/${orgId}/members`);
  },

  addOrganizationMember: (orgId, memberData) => {
    return api.post(`/organizations/${orgId}/members`, memberData);
  },

  removeOrganizationMember: (orgId, userId) => {
    return api.delete(`/organizations/${orgId}/members/${userId}`);
  },

  getOrganizationDepartments: (orgId) => {
    return api.get(`/organizations/${orgId}/departments`);
  },

  // Department methods
  getDepartments: (orgId) => {
    return api.get('/departments', { params: { organization_id: orgId } });
  },

  getDepartmentDetail: (deptId) => {
    return api.get(`/departments/${deptId}`);
  },

  createDepartment: (data) => {
    return api.post('/departments', data);
  },

  updateDepartment: (deptId, data) => {
    return api.put(`/departments/${deptId}`, data);
  },

  deleteDepartment: (deptId) => {
    return api.delete(`/departments/${deptId}`);
  },

  getDepartmentEmployees: (deptId) => {
    return api.get(`/departments/${deptId}/employees`);
  },

  getDepartmentTeams: (deptId) => {
    return api.get(`/departments/${deptId}/teams`);
  },

  // Team methods
  getUserTeams: () => {
    return api.get('/users/me/teams');
  },

  createTeam: (data) => {
    return api.post('/teams', data);
  },

  getTeamDetail: (teamId) => {
    return api.get(`/teams/${teamId}`);
  },

  updateTeam: (teamId, data) => {
    return api.put(`/teams/${teamId}`, data);
  },

  deleteTeam: (teamId) => {
    return api.delete(`/teams/${teamId}`);
  },

  getTeamEmployees: (teamId) => {
    return api.get(`/teams/${teamId}/employees`);
  },

  addTeamEmployee: (teamId, employeeData) => {
    return api.post(`/teams/${teamId}/employees`, employeeData);
  },

  removeTeamEmployee: (teamId, employeeId) => {
    return api.delete(`/teams/${teamId}/employees/${employeeId}`);
  },

  getOrganizationTeams: (orgId) => {
    return api.get('/teams', { params: { organization_id: orgId } });
  },

  // Employee methods
  getEmployees: (filters = {}) => {
    return api.get('/employees', { params: filters });
  },

  getEmployeeDetail: (employeeId) => {
    return api.get(`/employees/${employeeId}`);
  },

  createEmployee: (data) => {
    return api.post('/employees', data);
  },

  updateEmployee: (employeeId, data) => {
    return api.put(`/employees/${employeeId}`, data);
  },

  deleteEmployee: (employeeId) => {
    return api.delete(`/employees/${employeeId}`);
  }
};

export default profileService;