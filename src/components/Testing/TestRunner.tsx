import React, { useState, useEffect } from 'react';
import { TestTube, Play, Square, CheckCircle, XCircle, AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import { ComprehensiveTestRunner } from './ComprehensiveTestRunner';
import { ProductionTestRunner } from '../../utils/testRunner';
import { TestResult } from '../../types';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../Common/Toast';
import { Card, CardHeader, CardContent } from '../Common/Card';
import { Button } from '../Common/Button';
import { PageLayout } from '../Common/PageLayout';

export function TestRunner() {
  const [activeTab, setActiveTab] = useState<'comprehensive' | 'manual'>('comprehensive');
  const [isRunning, setIsRunning] = useState(false);
  const [manualTests, setManualTests] = useState<TestResult[]>([]);
  const [overallStats, setOverallStats] = useState({
    passed: 0,
    failed: 0,
    warnings: 0,
    total: 0,
    passRate: 0
  });
  const { showToast } = useToast();

  const runAllTests = async () => {
    setIsRunning(true);
    setManualTests([]);

    try {
      showToast({
        type: 'info',
        title: 'Running Manual Tests',
        message: 'Manual test suite started...'
      });

      const testRunner = ProductionTestRunner.getInstance();
      const results = await testRunner.runFullSystemTest();
      
      setManualTests(results.results);
      
      const stats = {
        passed: results.passed,
        failed: results.failed,
        warnings: results.warnings,
        total: results.total,
        passRate: results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0
      };
      setOverallStats(stats);

      if (results.failed === 0) {
        showToast({
          type: 'success',
          title: 'All Tests Passed!',
          message: `${results.total} tests completed successfully (${stats.passRate}%)`
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Tests Completed',
          message: `${results.passed}/${results.total} tests passed (${stats.passRate}%)`
        });
      }

    } catch (error) {
      console.error('Test execution failed:', error);
      showToast({
        type: 'error',
        title: 'Test Failed',
        message: 'Failed to execute manual test suite'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-400';
      case 'fail': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return CheckCircle;
      case 'fail': return XCircle;
      case 'warning': return AlertTriangle;
      default: return TestTube;
    }
  };

  return (
    <PageLayout
      title="Test Runner"
      subtitle="Comprehensive application testing suite"
      icon={TestTube}
      actions={
        <div className="flex items-center space-x-4">
          <div className="bg-dark-800 rounded-lg p-1 flex">
            <button
              onClick={() => setActiveTab('comprehensive')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'comprehensive'
                  ? 'bg-crimson-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Production Testing
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'manual'
                  ? 'bg-crimson-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Manual Testing
            </button>
          </div>
          {isRunning && <LoadingSpinner size="sm" />}
          {activeTab === 'manual' && (
            <Button
              variant="primary"
              icon={isRunning ? Square : Play}
              onClick={runAllTests}
              disabled={isRunning}
              loading={isRunning}
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Tab Content */}
        {activeTab === 'comprehensive' ? (
          <ComprehensiveTestRunner />
        ) : (
          <>
            {/* Overall Stats */}
            {manualTests.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <p className="text-sm text-gray-400">Total Tests</p>
                      <p className="text-2xl font-bold text-white">{overallStats.total}</p>
                    </div>
                    <TestTube className="w-8 h-8 text-blue-400" />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <p className="text-sm text-gray-400">Passed</p>
                      <p className="text-2xl font-bold text-green-400">{overallStats.passed}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <p className="text-sm text-gray-400">Failed</p>
                      <p className="text-2xl font-bold text-red-400">{overallStats.failed}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-400" />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <p className="text-sm text-gray-400">Pass Rate</p>
                      <p className="text-2xl font-bold text-white">{overallStats.passRate}%</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-400" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Test Results */}
            {manualTests.length > 0 && (
              <Card>
                <CardHeader title="Manual Test Results" subtitle="Detailed test execution results" />
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {manualTests.map((result, index) => {
                      const StatusIcon = getStatusIcon(result.status);
                      const statusColor = getStatusColor(result.status);
                      
                      return (
                        <div key={index} className="bg-dark-900/50 border border-dark-700/30 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${statusColor}`} />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-400">{result.component}</span>
                                <span className="text-gray-600">•</span>
                                <h4 className="font-medium text-white">{result.test}</h4>
                              </div>
                              <p className={`text-sm mt-1 ${statusColor}`}>{result.message}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                {result.timestamp.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Getting Started */}
            {manualTests.length === 0 && !isRunning && (
              <Card>
                <CardContent className="text-center py-12">
                  <TestTube className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Manual Test Runner</h3>
                  <p className="text-gray-400 mb-6">
                    Run comprehensive manual tests to validate application functionality, 
                    UI components, and user interactions.
                  </p>
                  <Button
                    variant="primary"
                    icon={Play}
                    onClick={runAllTests}
                  >
                    Start Manual Tests
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}