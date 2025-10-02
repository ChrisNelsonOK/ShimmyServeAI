import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Download, CreditCard as Edit, Trash2, File, FileText, Database, Settings, Tag } from 'lucide-react';
import { database } from '../../lib/database';
import { SectionLoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../Common/Toast';
import { InputField, SelectField, TextareaField } from '../Common/FormField';
import { validateForm, requiredValidation } from '../../utils/validation';
import { useAuth } from '../../hooks/useAuth';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'dataset' | 'model' | 'config';
  tags: string[];
  created_at: string;
  updated_at: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  created_by: string | null;
}

interface KnowledgeFormData {
  title: string;
  content: string;
  type: 'document' | 'dataset' | 'model' | 'config';
  tags: string;
}

export function KnowledgeBase() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [formData, setFormData] = useState<KnowledgeFormData>({
    title: '',
    content: '',
    type: 'document',
    tags: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { showToast } = useToast();

  const validationSchema = {
    title: [requiredValidation],
    content: [requiredValidation],
    type: [requiredValidation],
    tags: [] // Optional field
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const items = database.getKnowledgeItems();
      
      // Convert from database format to UI format
      const formattedItems = items.map(item => ({
        ...item,
        tags: item.tags ? JSON.parse(item.tags) : [],
        created_by: item.created_by || null
      }));
      
      setItems(formattedItems);
    } catch (error) {
      console.error('Error fetching knowledge items:', error);
      showToast({
        type: 'error',
        title: 'Fetch Error',
        message: 'Failed to load knowledge base items'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof KnowledgeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', type: 'document', tags: '' });
    setFormErrors({});
    setShowCreateForm(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(formData, validationSchema);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      const size = new Blob([formData.content]).size;

      if (editingItem) {
        database.updateKnowledgeItem(editingItem, {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          tags: JSON.stringify(tags),
          size
        });
        
        showToast({
          type: 'success',
          title: 'Item Updated',
          message: 'Knowledge base item has been successfully updated'
        });
      } else {
        database.createKnowledgeItem({
          title: formData.title,
          content: formData.content,
          type: formData.type,
          tags: JSON.stringify(tags),
          size,
          status: 'ready',
          created_by: user?.id || undefined
        });
        
        showToast({
          type: 'success',
          title: 'Item Created',
          message: 'Knowledge base item has been successfully created'
        });
      }
      
      resetForm();
      fetchItems();
    } catch (error) {
      console.error('Error saving knowledge item:', error);
      showToast({
        type: 'error',
        title: 'Save Error',
        message: 'Failed to save knowledge base item'
      });
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setFormData({
      title: item.title,
      content: item.content,
      type: item.type,
      tags: (item.tags || []).join(', ')
    });
    setEditingItem(item.id);
    setShowCreateForm(true);
  };

  const handleDelete = async (item: KnowledgeItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.title}"? This action cannot be undone.`)) {
      try {
        database.deleteKnowledgeItem(item.id);
        
        showToast({
          type: 'success',
          title: 'Item Deleted',
          message: 'Knowledge base item has been successfully deleted'
        });
        
        fetchItems();
      } catch (error) {
        console.error('Error deleting knowledge item:', error);
        showToast({
          type: 'error',
          title: 'Delete Error',
          message: 'Failed to delete knowledge base item'
        });
      }
    }
  };

  const handleExport = (item: KnowledgeItem) => {
    const blob = new Blob([item.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return FileText;
      case 'dataset': return Database;
      case 'model': return File;
      case 'config': return Settings;
      default: return File;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'text-blue-400 bg-blue-500/20';
      case 'dataset': return 'text-green-400 bg-green-500/20';
      case 'model': return 'text-purple-400 bg-purple-500/20';
      case 'config': return 'text-orange-400 bg-orange-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredItems = items.filter(item => {
    if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.content.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (typeFilter && item.type !== typeFilter) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    if (tagFilter && !(item.tags || []).some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))) {
      return false;
    }
    return true;
  });

  // Unused variable removed to fix TypeScript error
  // const allTags = Array.from(new Set(items.flatMap(item => item.tags || [])));

  if (loading && items.length === 0) {
    return <SectionLoadingSpinner text="Loading knowledge base..." />;
  }

  return (
    <div className="p-6 space-y-6 bg-dark-950 min-h-full text-dark-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crimson-500 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-dark-50">Knowledge Base</h1>
            <p className="text-dark-300">Manage documents, datasets, and configurations</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-crimson-500 text-white rounded-lg hover:bg-crimson-600 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {['document', 'dataset', 'model', 'config'].map(type => {
          const count = items.filter(item => item.type === type).length;
          const TypeIcon = getTypeIcon(type);
          const typeColor = getTypeColor(type);
          
          return (
            <div key={type} className="bg-dark-800 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-300 capitalize">{type}s</p>
                  <p className="text-2xl font-bold text-dark-50">{count}</p>
                </div>
                <TypeIcon className={`w-8 h-8 ${typeColor.split(' ')[0]}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <InputField
            label="Search"
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(value) => setSearchTerm(value)}
          />
          
          <SelectField
            label="Type"
            value={typeFilter}
            onChange={(value) => setTypeFilter(value)}
            options={[
              { value: '', label: 'All Types' },
              { value: 'document', label: 'Documents' },
              { value: 'dataset', label: 'Datasets' },
              { value: 'model', label: 'Models' },
              { value: 'config', label: 'Configs' }
            ]}
          />
          
          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'ready', label: 'Ready' },
              { value: 'processing', label: 'Processing' },
              { value: 'error', label: 'Error' }
            ]}
          />
          
          <InputField
            label="Tag Filter"
            type="text"
            placeholder="Filter by tags..."
            value={tagFilter}
            onChange={(value) => setTagFilter(value)}
          />
          
          <div className="flex items-end">
            <div className="text-sm text-dark-300">
              {filteredItems.length} of {items.length} items
            </div>
          </div>
        </div>
      </div>

      {/* Knowledge Items */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const TypeIcon = getTypeIcon(item.type);
            const typeColor = getTypeColor(item.type);
            const statusColor = getStatusColor(item.status);
            
            return (
              <div
                key={item.id}
                className="bg-dark-700 border border-dark-600 rounded-lg p-4 hover:border-dark-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${typeColor}`}>
                      <TypeIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-dark-50">{item.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${typeColor}`}>
                          {item.type}
                        </span>
                        <span className={`text-sm font-medium ${statusColor}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-dark-200 mb-2 line-clamp-2">
                        {item.content.substring(0, 150)}...
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(item.tags || []).map(tag => (
                          <span key={tag} className="px-2 py-1 text-xs bg-dark-600 text-dark-200 rounded flex items-center space-x-1">
                            <Tag className="w-3 h-3" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-dark-400">
                        <span>Size: {formatSize(item.size)}</span>
                        <span>•</span>
                        <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleExport(item)}
                      className="p-2 text-dark-400 hover:text-dark-50 rounded-lg hover:bg-dark-600 transition-colors"
                      title="Export"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-dark-400 hover:text-dark-50 rounded-lg hover:bg-dark-600 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 text-dark-400 hover:text-red-400 rounded-lg hover:bg-dark-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-dark-500 mx-auto mb-3" />
              <p className="text-dark-300 font-medium">No knowledge items found</p>
              <p className="text-dark-400 text-sm">
                {searchTerm || typeFilter || statusFilter || tagFilter
                  ? 'Try adjusting your filters'
                  : 'Knowledge base items will appear here'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-dark-50 mb-4">
              {editingItem ? 'Edit Knowledge Item' : 'Create Knowledge Item'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                label="Title"
                type="text"
                required
                value={formData.title}
                onChange={(value) => handleInputChange('title', value)}
                error={formErrors.title}
                placeholder="Enter item title"
              />
              
              <SelectField
                label="Type"
                required
                value={formData.type}
                onChange={(value) => handleInputChange('type', value as any)}
                error={formErrors.type}
                options={[
                  { value: 'document', label: 'Document' },
                  { value: 'dataset', label: 'Dataset' },
                  { value: 'model', label: 'Model' },
                  { value: 'config', label: 'Configuration' }
                ]}
              />
              
              <TextareaField
                label="Content"
                required
                value={formData.content}
                onChange={(value) => handleInputChange('content', value)}
                error={formErrors.content}
                placeholder="Enter content..."
                rows={10}
              />
              
              <InputField
                label="Tags"
                type="text"
                value={formData.tags}
                onChange={(value) => handleInputChange('tags', value)}
                placeholder="Enter tags separated by commas"
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-dark-300 hover:text-dark-50 border border-dark-600 rounded-lg hover:border-dark-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-crimson-500 text-white rounded-lg hover:bg-crimson-600 transition-colors"
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}