import React, { useState, useEffect } from 'react';
import { TestTube, Play, Square, CheckCircle, XCircle, AlertTriangle, BarChart3, RefreshCw, Download, Eye } from 'lucide-react';
import { ProductionTestRunner } from '../../utils/testRunner';
import { TestResult } from '../../types';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../Common/Toast';
import { Card, CardHeader, CardContent } from '../Common/Card';
import { Button } from '../Common/Button';
import { Modal } from '../Common/Modal';

interface TestStats {
  passed: number;
  failed: number;
  warnings: number;
  total: number;
  passRate: number;
}

interface TestCategory {
  name: string;
  results: TestResult[];
  stats: TestStats;
}

export function ComprehensiveTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testCategories, setTestCategories] = useState<TestCategory[]>([]);
  const [overallStats, setOverallStats] = useState<TestStats>({
    passed: 0,
    failed: 0,
    warnings: 0,
    total: 0,
    passRate: 0
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const { showToast } = useToast();

  const runComprehensiveTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setTestCategories([]);

    try {
      showToast({
        type: 'info',
        title: 'Running Tests',
        message: 'Comprehensive test suite started...'
      });

      const testRunner = ProductionTestRunner.getInstance();
      const results = await testRunner.runFullSystemTest();
      
      setTestResults(results.results);
      
      // Calculate overall stats
      const stats: TestStats = {
        passed: results.passed,
        failed: results.failed,
        warnings: results.warnings,
        total: results.total,
        passRate: results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0
      };
      setOverallStats(stats);

      // Group results by category
      const categories = groupResultsByCategory(results.results);
      setTestCategories(categories);

      // Show completion toast
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
        message: 'Failed to execute comprehensive test suite'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const groupResultsByCategory = (results: TestResult[]): TestCategory[] => {
    const categoryMap = new Map<string, TestResult[]>();
    
    results.forEach(result => {
      if (!categoryMap.has(result.component)) {
        categoryMap.set(result.component, []);
      }
      categoryMap.get(result.component)!.push(result);
    });

    return Array.from(categoryMap.entries()).map(([name, results]) => {
      const passed = results.filter(r => r.status === 'pass').length;
      const failed = results.filter(r => r.status === 'fail').length;
      const warnings = results.filter(r => r.status === 'warning').length;
      const total = results.length;
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      return {
        name,
        results,
        stats: { passed, failed, warnings, total, passRate }
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      overallStats,
      categories: testCategories,
      detailedResults: testResults
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shimmyserve-test-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return CheckCircle;
      case 'fail': return XCircle;
      case 'warning': return AlertTriangle;
      default: return TestTube;
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

  const getCategoryStatusColor = (stats: TestStats) => {
    if (stats.failed > 0) return 'text-red-400';
    if (stats.warnings > 0) return 'text-yellow-400';
    if (stats.passed === stats.total && stats.total > 0) return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader
          title="Comprehensive Test Suite"
          subtitle="Production-ready testing framework with full E2E coverage"
          actions={
            <div className="flex items-center space-x-3">
              {isRunning && <LoadingSpinner size="sm" />}
              {testResults.length > 0 && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Eye}
                    onClick={() => setShowResultsModal(true)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    onClick={exportResults}
                  >
                    Export
                  </Button>
                </>
              )}
              <Button
                variant="primary"
                icon={isRunning ? Square : Play}
                onClick={runComprehensiveTests}
                disabled={isRunning}
                loading={isRunning}
              >
                {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
              </Button>
            </div>
          }
        />
      </Card>

      {/* Overall Stats */}
      {testResults.length > 0 && (
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

      {/* Test Categories */}
      {testCategories.length > 0 && (
        <Card>
          <CardHeader title="Test Categories" subtitle="Results grouped by component category" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testCategories.map(category => {
                const statusColor = getCategoryStatusColor(category.stats);
                
                return (
                  <div
                    key={category.name}
                    className="bg-dark-900/50 border border-dark-700/30 rounded-lg p-4 hover:border-dark-600 transition-colors cursor-pointer"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">{category.name}</h3>
                      <span className={`text-sm font-medium ${statusColor}`}>
                        {category.stats.passRate}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{category.stats.passed}/{category.stats.total} passed</span>
                      {category.stats.failed > 0 && (
                        <span className="text-red-400">{category.stats.failed} failed</span>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-dark-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            category.stats.failed > 0 ? 'bg-red-500' :
                            category.stats.warnings > 0 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${category.stats.passRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Detail Modal */}
      {selectedCategory && (
        <Modal
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          title={`${selectedCategory} Test Results`}
          size="lg"
        >
          <div className="space-y-4">
            {testCategories
              .find(c => c.name === selectedCategory)
              ?.results.map((result, index) => {
                const StatusIcon = getStatusIcon(result.status);
                const statusColor = getStatusColor(result.status);
                
                return (
                  <div key={index} className="bg-dark-900/50 border border-dark-700/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${statusColor}`} />
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{result.test}</h4>
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
        </Modal>
      )}

      {/* Detailed Results Modal */}
      <Modal
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        title="Detailed Test Results"
        size="xl"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {testResults.map((result, index) => {
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
      </Modal>

      {/* Production Readiness Status */}
      {testResults.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                overallStats.failed === 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {overallStats.failed === 0 ? (
                  <CheckCircle className="w-8 h-8 text-green-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-400" />
                )}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">
                {overallStats.failed === 0 ? 'Production Ready!' : 'Needs Attention'}
              </h3>
              
              <p className="text-gray-400 mb-4">
                {overallStats.failed === 0 
                  ? `All ${overallStats.total} tests passed. Application is ready for production deployment.`
                  : `${overallStats.failed} tests failed. Please review and fix issues before deploying to production.`
                }
              </p>
              
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-400">{overallStats.passed} Passed</span>
                </div>
                {overallStats.failed > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-400">{overallStats.failed} Failed</span>
                  </div>
                )}
                {overallStats.warnings > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-yellow-400">{overallStats.warnings} Warnings</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}