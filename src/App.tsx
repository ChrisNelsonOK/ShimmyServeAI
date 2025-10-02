import React, { useState, useEffect } from 'react';
import { ToastProvider } from './components/Common/Toast';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { AuthLayout } from './components/Auth/AuthLayout';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { NetworkStatus } from './components/Common/NetworkStatus';
import { PageLoadingSpinner } from './components/Common/LoadingSpinner';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Terminal } from './components/Terminal/Terminal';
import { MCPServer } from './components/MCP/MCPServer';
import { LogsInterface } from './components/Logs/LogsInterface';
import { KnowledgeBase } from './components/Knowledge/KnowledgeBase';
import { UserManagement } from './components/Users/UserManagement';
import { NetworkManagement } from './components/Network/NetworkManagement';
import { AdvancedMonitoring } from './components/Monitoring/AdvancedMonitoring';
import { PerformanceMonitor } from './components/Performance/PerformanceMonitor';
import { SecurityCenter } from './components/Security/SecurityCenter';
import { Settings } from './components/Settings/Settings';
import { TestRunner } from './components/Testing/TestRunner';
import { useAuth } from './hooks/useAuth';
import { useLocalStorage } from './hooks/useLocalStorage';
import './index.css';

export default function App() {
  const { user, userProfile, loading } = useAuth();
  const [activeSection, setActiveSection] = useLocalStorage('activeSection', 'dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebarCollapsed', false);

  // Show loading spinner while initializing
  if (loading) {
    return (
      <>
        <PageLoadingSpinner />
        <NetworkStatus />
      </>
    );
  }

  // Show authentication layout if not logged in
  if (!user || !userProfile) {
    return (
      <>
        <AuthLayout />
        <NetworkStatus />
      </>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'terminal':
        return <Terminal />;
      case 'mcp':
        return <MCPServer />;
      case 'logs':
        return <LogsInterface />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'users':
        return <UserManagement />;
      case 'network':
        return <NetworkManagement />;
      case 'monitoring':
        return <AdvancedMonitoring />;
      case 'performance':
        return <PerformanceMonitor />;
      case 'security':
        return <SecurityCenter />;
      case 'settings':
        return <Settings />;
      case 'testing':
        return <TestRunner />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-dark-950 flex">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          userRole={userProfile?.role}
        />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          <Header onSectionChange={setActiveSection} />
          
          <main className="flex-1 overflow-auto">
            <div className="min-h-full">
              <ErrorBoundary>
                {renderActiveSection()}
              </ErrorBoundary>
            </div>
          </main>
        </div>
        
        <NetworkStatus />
      </div>
    </ErrorBoundary>
  );
}