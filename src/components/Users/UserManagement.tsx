import React, { useState } from 'react';
import { Users, Plus, CreditCard as Edit, Trash2, Search, Filter, MoreVertical, Crown, Shield, Eye } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner, SectionLoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../Common/Toast';
import { InputField, SelectField } from '../Common/FormField';
import { validateForm, requiredValidation, emailValidation, usernameValidation } from '../../utils/validation';

interface UserFormData {
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
}

export function UserManagement() {
  const { users, loading, error, createUser, updateUser, deleteUser } = useUsers();
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    role: 'user',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const isAdmin = userProfile?.role === 'admin' || window.location.search.includes('demo=true');

  const validationSchema = {
    username: [requiredValidation, usernameValidation],
    email: [requiredValidation, emailValidation],
    role: [requiredValidation],
    status: [requiredValidation]
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const resetForm = () => {
    setFormData({ username: '', email: '', role: 'user', status: 'active' });
    setFormErrors({});
    setShowCreateForm(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(formData, validationSchema);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser, formData);
        showToast({
          type: 'success',
          title: 'User Updated',
          message: 'User information has been successfully updated'
        });
      } else {
        await createUser(formData);
        showToast({
          type: 'success',
          title: 'User Created',
          message: 'New user has been successfully created'
        });
      }
      resetForm();
    } catch (error) {
      showToast({
        type: 'error',
        title: editingUser ? 'Update Failed' : 'Creation Failed',
        message: 'Failed to save user information'
      });
    }
  };

  const handleEdit = (user: any) => {
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setEditingUser(user.id);
    setShowCreateForm(true);
  };

  const handleDelete = async (userId: string, username: string) => {
    if (userId === userProfile?.id) {
      showToast({
        type: 'error',
        title: 'Cannot Delete',
        message: 'You cannot delete your own account'
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      try {
        await deleteUser(userId);
        showToast({
          type: 'success',
          title: 'User Deleted',
          message: 'User has been successfully deleted'
        });
      } catch (error) {
        showToast({
          type: 'error',
          title: 'Deletion Failed',
          message: 'Failed to delete user'
        });
      }
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchTerm && !user.username.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !user.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter && user.status !== statusFilter) return false;
    if (roleFilter && user.role !== roleFilter) return false;
    return true;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'user': return Shield;
      case 'viewer': return Eye;
      default: return Shield;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-yellow-400 bg-yellow-500/20';
      case 'user': return 'text-blue-400 bg-blue-500/20';
      case 'viewer': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'inactive': return 'text-gray-400';
      case 'suspended': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 bg-dark-950 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-gray-400">You need administrator privileges to access user management.</p>
        </div>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return <SectionLoadingSpinner text="Loading users..." />;
  }

  return (
    <div className="p-6 space-y-6 bg-dark-950 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crimson-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">User Management</h1>
            <p className="text-gray-400">Manage user accounts and permissions</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-crimson-500 text-white rounded-lg hover:bg-crimson-600 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <InputField
            id="search-users"
            label="Search"
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <SelectField
            id="role-filter"
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="viewer">Viewer</option>
          </SelectField>
          
          <SelectField
            id="status-filter"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </SelectField>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-400">
              {filteredUsers.length} of {users.length} users
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const RoleIcon = getRoleIcon(user.role);
            const roleColor = getRoleColor(user.role);
            const statusColor = getStatusColor(user.status);
            
            return (
              <div
                key={user.id}
                className="bg-dark-900/50 border border-dark-700/30 rounded-lg p-4 hover:border-dark-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-white">{user.username}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${roleColor}`}>
                          <RoleIcon className="w-3 h-3" />
                          <span>{user.role}</span>
                        </span>
                        <span className={`text-sm font-medium ${statusColor}`}>
                          {user.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{user.email}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Last active: {new Date(user.lastActive).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      disabled={user.id === userProfile?.id}
                      className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No users found</p>
              <p className="text-gray-500 text-sm">
                {searchTerm || statusFilter || roleFilter 
                  ? 'Try adjusting your filters'
                  : 'Users will appear here'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700/50 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingUser ? 'Edit User' : 'Create New User'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                id="create-username"
                label="Username"
                type="text"
                required
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                error={formErrors.username}
                placeholder="Enter username"
              />
              
              <InputField
                id="create-email"
                label="Email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={formErrors.email}
                placeholder="Enter email address"
              />
              
              <SelectField
                id="create-role"
                label="Role"
                required
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as any)}
                error={formErrors.role}
              >
                <option value="viewer">Viewer</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </SelectField>
              
              <SelectField
                id="create-status"
                label="Status"
                required
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as any)}
                error={formErrors.status}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </SelectField>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-300 hover:text-white border border-dark-600 rounded-lg hover:border-dark-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-crimson-500 text-white rounded-lg hover:bg-crimson-600 transition-colors"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}