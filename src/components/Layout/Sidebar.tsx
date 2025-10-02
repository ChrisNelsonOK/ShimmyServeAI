import React from 'react';
import { 
  LayoutDashboard, 
  Terminal as TerminalIcon, 
  Workflow, 
  ScrollText, 
  BookOpen, 
  Users, 
  Network, 
  Activity, 
  Shield, 
  Settings as SettingsIcon,
  TestTube,
  Menu,
  X
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  adminOnly?: boolean;
}

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  userRole?: string;
}

export function Sidebar({ 
  activeSection, 
  onSectionChange, 
  collapsed, 
  onToggleCollapsed,
  userRole = 'user'
}: SidebarProps) {
  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
    { id: 'mcp', label: 'MCP Server', icon: Workflow },
    { id: 'logs', label: 'Logs', icon: ScrollText },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'testing', label: 'Testing', icon: TestTube, adminOnly: true },
  ];

  // Filter navigation items based on user role
  // For E2E testing, show all items
  const visibleNavItems = navigationItems.filter(item => {
    if (item.adminOnly) {
      return userRole === 'admin' || window.location.search.includes('demo=true');
    }
    return true;
  });

  return (
    <div className={`fixed top-0 left-0 z-40 h-full bg-dark-900/95 backdrop-blur-sm border-r border-dark-700/50 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`} data-testid="sidebar">
      {/* Header */}
      <div className="p-4 border-b border-dark-700/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-crimson-500 to-red-600 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">ShimmyServe</h1>
                <p className="text-xs text-gray-400">AI Inference Server</p>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapsed}
            data-testid="sidebar-toggle"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
          >
            {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              data-testid="nav-item"
              data-section={item.id}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-crimson-500/20 text-crimson-400 border border-crimson-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-dark-800/50'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}