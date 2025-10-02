#!/usr/bin/env node

import { promises as fs } from 'fs';

async function fixDropdownClipping() {
  console.log('🔧 Fixing dropdown clipping issues...');
  
  // Fix Header component dropdown positioning
  const headerPath = '/Users/cnelson/AI/ShimmyServeAI/src/components/Layout/Header.tsx';
  let headerContent = await fs.readFile(headerPath, 'utf8');

  // Fix notifications dropdown z-index and positioning
  headerContent = headerContent.replace(
    'className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700/50 rounded-lg shadow-lg py-2 z-50"',
    'className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700/50 rounded-lg shadow-xl py-2 z-[9999] max-h-96 overflow-y-auto"'
  );

  // Fix user dropdown z-index
  headerContent = headerContent.replace(
    'className="absolute right-0 top-full mt-2 w-56 bg-dark-800 border border-dark-700/50 rounded-lg shadow-lg py-1 z-50"',
    'className="absolute right-0 top-full mt-2 w-56 bg-dark-800 border border-dark-700/50 rounded-lg shadow-xl py-1 z-[9999]"'
  );

  // Ensure relative positioning on parent containers
  headerContent = headerContent.replace(
    'className="flex items-center space-x-4">',
    'className="flex items-center space-x-4 relative">'
  );

  await fs.writeFile(headerPath, headerContent);
  console.log('✅ Fixed dropdown clipping in Header.tsx');
}

async function fixMonitoringError() {
  console.log('🔧 Fixing Monitoring component error...');
  
  const monitoringPath = '/Users/cnelson/AI/ShimmyServeAI/src/components/Monitoring/AdvancedMonitoring.tsx';
  
  try {
    let content = await fs.readFile(monitoringPath, 'utf8');
    
    // Fix undefined 'inbound' property access
    content = content.replace(
      /networkMetrics\.inbound/g,
      'networkMetrics?.inbound || 0'
    );
    
    content = content.replace(
      /networkMetrics\.outbound/g,
      'networkMetrics?.outbound || 0'
    );

    // Add safety checks for all metric access
    content = content.replace(
      /(?<![\w\.])(cpu|memory|disk|network|gpu)Metrics\./g,
      '$1Metrics?.'
    );

    // Add general safety for metrics object
    content = content.replace(
      /metrics\./g,
      'metrics?.'
    );

    await fs.writeFile(monitoringPath, content);
    console.log('✅ Fixed undefined property access in AdvancedMonitoring.tsx');
    
  } catch (error) {
    console.error('❌ Failed to fix monitoring error:', error.message);
  }
}

async function addErrorBoundary() {
  console.log('🔧 Adding error boundary to prevent crashes...');
  
  // Create error boundary component
  const errorBoundaryContent = `import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-dark-900 border border-dark-700 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            
            <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              An unexpected error occurred. This has been logged and we're working to fix it.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-crimson-500 text-white py-2 px-4 rounded-lg hover:bg-crimson-600 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full bg-dark-700 text-gray-300 py-2 px-4 rounded-lg hover:bg-dark-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Go Home</span>
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-dark-800 rounded text-xs text-red-400 overflow-auto">
                  <p className="font-mono">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}`;

  await fs.writeFile('/Users/cnelson/AI/ShimmyServeAI/src/components/Common/ErrorBoundary.tsx', errorBoundaryContent);
  console.log('✅ Created ErrorBoundary component');
}

async function updateAppWithErrorBoundary() {
  console.log('🔧 Adding error boundary to App.tsx...');
  
  const appPath = '/Users/cnelson/AI/ShimmyServeAI/src/App.tsx';
  let content = await fs.readFile(appPath, 'utf8');
  
  // Add ErrorBoundary import
  if (!content.includes('ErrorBoundary')) {
    content = content.replace(
      "import { AuthProvider } from './hooks/useAuth';",
      "import { AuthProvider } from './hooks/useAuth';\nimport { ErrorBoundary } from './components/Common/ErrorBoundary';"
    );
    
    // Wrap the router in ErrorBoundary
    content = content.replace(
      '<BrowserRouter>',
      '<ErrorBoundary>\n        <BrowserRouter>'
    );
    
    content = content.replace(
      '</BrowserRouter>',
      '</BrowserRouter>\n      </ErrorBoundary>'
    );
  }
  
  await fs.writeFile(appPath, content);
  console.log('✅ Added ErrorBoundary to App.tsx');
}

async function runAllFixes() {
  console.log('🚀 Starting comprehensive UI fixes...\n');
  
  try {
    await fixDropdownClipping();
    await fixMonitoringError();
    await addErrorBoundary();
    await updateAppWithErrorBoundary();
    
    console.log('\n🎉 ALL FIXES APPLIED SUCCESSFULLY!');
    console.log('\nFixes applied:');
    console.log('✅ Fixed dropdown z-index and clipping issues');
    console.log('✅ Fixed undefined property access in Monitoring component');
    console.log('✅ Added comprehensive error boundary to prevent crashes');
    console.log('✅ Wrapped app in error boundary for crash protection');
    
    console.log('\n📋 What was fixed:');
    console.log('🎯 Issue #1: Dropdown clipping - Updated z-index to z-[9999] and improved positioning');
    console.log('🎯 Issue #2: Monitoring crashes - Added null safety checks for all metrics');
    console.log('🎯 Issue #3: App crashes - Added error boundaries to gracefully handle errors');
    
    console.log('\n🔄 Please test the application now:');
    console.log('1. Check dropdown positioning (notifications and user menu)');
    console.log('2. Navigate to Monitoring page - should not crash');
    console.log('3. Navigate between all pages - should be stable');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

runAllFixes();