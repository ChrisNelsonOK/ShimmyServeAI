#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';
const DEMO_USER = 'demo@example.com';
const DEMO_PASSWORD = 'demo123';

class ShimmyServeE2ETester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
  }

  async init() {
    console.log('🚀 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    this.page = await this.browser.newPage();

    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser Console Error:', msg.text());
      }
    });

    // Set up error handling
    this.page.on('pageerror', error => {
      console.error('Page Error:', error.message);
    });
  }

  async logTest(name, status, details = '') {
    const result = {
      name,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    console.log(`${status === 'passed' ? '✅' : '❌'} ${name} ${details ? `- ${details}` : ''}`);
  }

  async takeScreenshot(name) {
    const filename = `screenshot-${name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`;
    const filepath = join(__dirname, 'screenshots', filename);
    
    // Create screenshots directory if it doesn't exist
    await fs.mkdir(join(__dirname, 'screenshots'), { recursive: true });
    
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.screenshots.push({ name, filepath });
    console.log(`📸 Screenshot saved: ${filename}`);
  }

  async waitAndClick(selector, description) {
    try {
      await this.page.waitForSelector(selector, { timeout: 10000 });
      await this.page.click(selector);
      await this.logTest(`Click ${description}`, 'passed');
      return true;
    } catch (error) {
      await this.logTest(`Click ${description}`, 'failed', error.message);
      return false;
    }
  }

  async waitAndType(selector, text, description) {
    try {
      await this.page.waitForSelector(selector, { timeout: 10000 });
      await this.page.type(selector, text);
      await this.logTest(`Type in ${description}`, 'passed');
      return true;
    } catch (error) {
      await this.logTest(`Type in ${description}`, 'failed', error.message);
      return false;
    }
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication Flow...');
    
    // Navigate to app
    await this.page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await this.takeScreenshot('login-page');

    // Test login
    await this.waitAndType('input[placeholder*="username" i], input[name="username"], input[name="email"], input[type="email"]', DEMO_USER, 'email field');
    await this.waitAndType('input[type="password"]', DEMO_PASSWORD, 'password field');
    await this.waitAndClick('button[type="submit"]', 'login button');

    // Wait for dashboard
    try {
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      await this.page.waitForSelector('[data-testid="dashboard"], h1:has-text("Dashboard"), .dashboard', { timeout: 10000 });
      await this.logTest('Login successful', 'passed');
      await this.takeScreenshot('dashboard-after-login');
    } catch (error) {
      await this.logTest('Login', 'failed', error.message);
    }
  }

  async testNavigation() {
    console.log('\n🧭 Testing Navigation...');

    const navItems = [
      { selector: 'a[href*="dashboard"], nav a:has-text("Dashboard")', name: 'Dashboard' },
      { selector: 'a[href*="logs"], nav a:has-text("Logs")', name: 'Logs' },
      { selector: 'a[href*="terminal"], nav a:has-text("Terminal")', name: 'Terminal' },
      { selector: 'a[href*="monitoring"], nav a:has-text("Monitoring")', name: 'Monitoring' },
      { selector: 'a[href*="settings"], nav a:has-text("Settings")', name: 'Settings' },
      { selector: 'a[href*="users"], nav a:has-text("Users")', name: 'User Management' },
      { selector: 'a[href*="security"], nav a:has-text("Security")', name: 'Security Center' },
      { selector: 'a[href*="performance"], nav a:has-text("Performance")', name: 'Performance' }
    ];

    for (const item of navItems) {
      try {
        await this.page.click(item.selector);
        await this.page.waitForTimeout(1000); // Wait for page to load
        await this.logTest(`Navigate to ${item.name}`, 'passed');
        await this.takeScreenshot(item.name.toLowerCase().replace(/\s+/g, '-'));
      } catch (error) {
        await this.logTest(`Navigate to ${item.name}`, 'failed', error.message);
      }
    }
  }

  async testDashboard() {
    console.log('\n📊 Testing Dashboard Features...');
    
    // Navigate to dashboard
    await this.page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
    await this.page.waitForTimeout(2000);

    // Test system metrics cards
    const metrics = ['cpu', 'memory', 'disk', 'network'];
    for (const metric of metrics) {
      try {
        const selector = `[data-testid="${metric}-metric"], .metric-card:has-text("${metric}")`;
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.logTest(`${metric} metric card visible`, 'passed');
      } catch (error) {
        await this.logTest(`${metric} metric card`, 'failed', 'Not found');
      }
    }

    // Test real-time updates
    try {
      const initialValue = await this.page.$eval('.metric-value', el => el.textContent);
      await this.page.waitForTimeout(5000); // Wait for updates
      const updatedValue = await this.page.$eval('.metric-value', el => el.textContent);
      
      if (initialValue !== updatedValue) {
        await this.logTest('Real-time metric updates', 'passed');
      } else {
        await this.logTest('Real-time metric updates', 'failed', 'Values not updating');
      }
    } catch (error) {
      await this.logTest('Real-time metric updates', 'failed', error.message);
    }
  }

  async testLogsViewer() {
    console.log('\n📜 Testing Logs Viewer...');
    
    await this.page.goto(`${APP_URL}/logs`, { waitUntil: 'networkidle0' });
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('logs-viewer');

    // Test log filters
    const logLevels = ['info', 'warn', 'error', 'debug'];
    for (const level of logLevels) {
      try {
        await this.page.click(`button:has-text("${level}"), input[value="${level}"]`);
        await this.page.waitForTimeout(1000);
        await this.logTest(`Filter logs by ${level}`, 'passed');
      } catch (error) {
        await this.logTest(`Filter logs by ${level}`, 'failed', error.message);
      }
    }

    // Test search functionality
    try {
      await this.waitAndType('input[placeholder*="search" i]', 'error', 'log search');
      await this.page.waitForTimeout(1000);
      await this.logTest('Log search functionality', 'passed');
    } catch (error) {
      await this.logTest('Log search functionality', 'failed', error.message);
    }

    // Test real-time log updates
    try {
      const initialCount = await this.page.$$eval('.log-entry', entries => entries.length);
      await this.page.waitForTimeout(5000);
      const updatedCount = await this.page.$$eval('.log-entry', entries => entries.length);
      
      if (updatedCount > initialCount) {
        await this.logTest('Real-time log updates', 'passed');
      } else {
        await this.logTest('Real-time log updates', 'failed', 'No new logs received');
      }
    } catch (error) {
      await this.logTest('Real-time log updates', 'failed', error.message);
    }
  }

  async testTerminal() {
    console.log('\n💻 Testing Terminal...');
    
    await this.page.goto(`${APP_URL}/terminal`, { waitUntil: 'networkidle0' });
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('terminal');

    // Test terminal input
    try {
      const commands = [
        { cmd: 'ls', description: 'List files' },
        { cmd: 'pwd', description: 'Print working directory' },
        { cmd: 'echo "Hello ShimmyServe"', description: 'Echo test' },
        { cmd: 'date', description: 'Show date' }
      ];

      for (const { cmd, description } of commands) {
        await this.waitAndType('.terminal-input, input[data-testid="terminal-input"]', cmd, `terminal command: ${description}`);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
        await this.logTest(`Terminal command: ${description}`, 'passed');
      }
    } catch (error) {
      await this.logTest('Terminal commands', 'failed', error.message);
    }

    // Test terminal controls
    try {
      await this.waitAndClick('button:has-text("Clear")', 'clear terminal button');
      await this.logTest('Clear terminal', 'passed');
    } catch (error) {
      await this.logTest('Clear terminal', 'failed', error.message);
    }
  }

  async testSettings() {
    console.log('\n⚙️ Testing Settings...');
    
    await this.page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle0' });
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('settings');

    // Test theme toggle
    try {
      await this.waitAndClick('button:has-text("Theme"), [data-testid="theme-toggle"]', 'theme toggle');
      await this.page.waitForTimeout(1000);
      await this.logTest('Theme toggle', 'passed');
    } catch (error) {
      await this.logTest('Theme toggle', 'failed', error.message);
    }

    // Test notification settings
    try {
      await this.waitAndClick('input[type="checkbox"][name*="notification"]', 'notification toggle');
      await this.logTest('Notification settings', 'passed');
    } catch (error) {
      await this.logTest('Notification settings', 'failed', error.message);
    }

    // Test save settings
    try {
      await this.waitAndClick('button:has-text("Save")', 'save settings button');
      await this.page.waitForTimeout(1000);
      await this.logTest('Save settings', 'passed');
    } catch (error) {
      await this.logTest('Save settings', 'failed', error.message);
    }
  }

  async testUserManagement() {
    console.log('\n👥 Testing User Management...');
    
    await this.page.goto(`${APP_URL}/users`, { waitUntil: 'networkidle0' });
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('user-management');

    // Test add user
    try {
      await this.waitAndClick('button:has-text("Add User"), button:has-text("New User")', 'add user button');
      await this.page.waitForTimeout(1000);
      
      // Fill user form
      await this.waitAndType('input[name="username"]', 'testuser', 'new username');
      await this.waitAndType('input[name="email"]', 'test@example.com', 'new email');
      await this.waitAndType('input[type="password"]', 'testpass123', 'new password');
      await this.waitAndClick('button:has-text("Create"), button:has-text("Add")', 'create user button');
      
      await this.logTest('Add new user', 'passed');
    } catch (error) {
      await this.logTest('Add new user', 'failed', error.message);
    }

    // Test user search
    try {
      await this.waitAndType('input[placeholder*="search" i]', 'demo', 'user search');
      await this.page.waitForTimeout(1000);
      await this.logTest('User search', 'passed');
    } catch (error) {
      await this.logTest('User search', 'failed', error.message);
    }

    // Test edit user
    try {
      await this.waitAndClick('button:has-text("Edit"):first', 'edit user button');
      await this.page.waitForTimeout(1000);
      await this.logTest('Edit user', 'passed');
    } catch (error) {
      await this.logTest('Edit user', 'failed', error.message);
    }
  }

  async testMonitoring() {
    console.log('\n📈 Testing Advanced Monitoring...');
    
    await this.page.goto(`${APP_URL}/monitoring`, { waitUntil: 'networkidle0' });
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('monitoring');

    // Test chart interactions
    try {
      const charts = await this.page.$$('.chart-container, canvas');
      await this.logTest(`Found ${charts.length} monitoring charts`, 'passed');
      
      // Test time range selector
      await this.waitAndClick('select[name="timeRange"], button:has-text("1h")', 'time range selector');
      await this.page.waitForTimeout(1000);
      await this.logTest('Time range selection', 'passed');
    } catch (error) {
      await this.logTest('Monitoring charts', 'failed', error.message);
    }

    // Test alert thresholds
    try {
      await this.waitAndType('input[name="cpuThreshold"]', '80', 'CPU threshold');
      await this.waitAndType('input[name="memoryThreshold"]', '90', 'Memory threshold');
      await this.waitAndClick('button:has-text("Save Thresholds")', 'save thresholds button');
      await this.logTest('Alert thresholds configuration', 'passed');
    } catch (error) {
      await this.logTest('Alert thresholds', 'failed', error.message);
    }
  }

  async testSecurityCenter() {
    console.log('\n🔒 Testing Security Center...');
    
    await this.page.goto(`${APP_URL}/security`, { waitUntil: 'networkidle0' });
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('security-center');

    // Test security scan
    try {
      await this.waitAndClick('button:has-text("Run Security Scan")', 'security scan button');
      await this.page.waitForTimeout(3000);
      await this.logTest('Security scan', 'passed');
    } catch (error) {
      await this.logTest('Security scan', 'failed', error.message);
    }

    // Test audit logs
    try {
      await this.waitAndClick('button:has-text("Audit Logs"), a:has-text("Audit")', 'audit logs tab');
      await this.page.waitForTimeout(1000);
      const auditEntries = await this.page.$$('.audit-entry');
      await this.logTest(`Audit logs (${auditEntries.length} entries)`, 'passed');
    } catch (error) {
      await this.logTest('Audit logs', 'failed', error.message);
    }

    // Test permissions
    try {
      await this.waitAndClick('button:has-text("Permissions"), a:has-text("Permissions")', 'permissions tab');
      await this.page.waitForTimeout(1000);
      await this.logTest('Permissions management', 'passed');
    } catch (error) {
      await this.logTest('Permissions management', 'failed', error.message);
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance Monitor...');
    
    await this.page.goto(`${APP_URL}/performance`, { waitUntil: 'networkidle0' });
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('performance-monitor');

    // Test performance metrics
    try {
      const metrics = ['Response Time', 'Throughput', 'Error Rate', 'Latency'];
      for (const metric of metrics) {
        const found = await this.page.$(`text="${metric}"`);
        if (found) {
          await this.logTest(`${metric} metric displayed`, 'passed');
        } else {
          await this.logTest(`${metric} metric`, 'failed', 'Not found');
        }
      }
    } catch (error) {
      await this.logTest('Performance metrics', 'failed', error.message);
    }

    // Test optimization suggestions
    try {
      await this.waitAndClick('button:has-text("Generate Report")', 'generate performance report');
      await this.page.waitForTimeout(2000);
      await this.logTest('Performance report generation', 'passed');
    } catch (error) {
      await this.logTest('Performance report', 'failed', error.message);
    }
  }

  async testResponsiveness() {
    console.log('\n📱 Testing Responsive Behavior...');

    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await this.page.setViewport({ width: viewport.width, height: viewport.height });
      await this.page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(1000);
      await this.takeScreenshot(`responsive-${viewport.name.toLowerCase()}`);
      await this.logTest(`${viewport.name} viewport (${viewport.width}x${viewport.height})`, 'passed');
    }
  }

  async testErrorHandling() {
    console.log('\n🚨 Testing Error Handling...');

    // Test 404 page
    try {
      await this.page.goto(`${APP_URL}/nonexistent-page`, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(1000);
      const has404 = await this.page.$('text="404"') || await this.page.$('text="Not Found"');
      if (has404) {
        await this.logTest('404 error handling', 'passed');
      } else {
        await this.logTest('404 error handling', 'failed', 'No 404 page shown');
      }
      await this.takeScreenshot('404-error');
    } catch (error) {
      await this.logTest('404 error handling', 'failed', error.message);
    }

    // Test API error handling
    try {
      // Temporarily block API endpoint to simulate error
      await this.page.setRequestInterception(true);
      this.page.once('request', interceptedRequest => {
        if (interceptedRequest.url().includes('/api/')) {
          interceptedRequest.abort();
        } else {
          interceptedRequest.continue();
        }
      });

      await this.page.goto(`${APP_URL}/logs`, { waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(2000);
      
      const errorMessage = await this.page.$('text="Error"') || await this.page.$('text="error"');
      if (errorMessage) {
        await this.logTest('API error handling', 'passed');
      } else {
        await this.logTest('API error handling', 'failed', 'No error message shown');
      }
      
      await this.page.setRequestInterception(false);
    } catch (error) {
      await this.logTest('API error handling', 'failed', error.message);
    }
  }

  async testWebSocketConnection() {
    console.log('\n🔌 Testing WebSocket Connection...');

    try {
      // Check for WebSocket connection in browser console
      const wsConnected = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          // Check if WebSocket is connected
          const ws = new WebSocket('ws://localhost:3001');
          ws.onopen = () => {
            ws.close();
            resolve(true);
          };
          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 5000);
        });
      });

      if (wsConnected) {
        await this.logTest('WebSocket connection', 'passed');
      } else {
        await this.logTest('WebSocket connection', 'failed', 'Could not connect');
      }
    } catch (error) {
      await this.logTest('WebSocket connection', 'failed', error.message);
    }
  }

  async testDataPersistence() {
    console.log('\n💾 Testing Data Persistence...');

    // Test localStorage persistence
    try {
      // Set a value
      await this.page.evaluate(() => {
        localStorage.setItem('testKey', 'testValue');
      });

      // Reload page
      await this.page.reload({ waitUntil: 'networkidle0' });

      // Check if value persists
      const value = await this.page.evaluate(() => {
        return localStorage.getItem('testKey');
      });

      if (value === 'testValue') {
        await this.logTest('LocalStorage persistence', 'passed');
      } else {
        await this.logTest('LocalStorage persistence', 'failed', 'Value not persisted');
      }
    } catch (error) {
      await this.logTest('LocalStorage persistence', 'failed', error.message);
    }

    // Test form data persistence
    try {
      await this.page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle0' });
      
      // Change a setting
      await this.waitAndType('input[name="apiUrl"]', API_URL, 'API URL setting');
      await this.waitAndClick('button:has-text("Save")', 'save button');
      
      // Reload and check
      await this.page.reload({ waitUntil: 'networkidle0' });
      const apiUrlValue = await this.page.$eval('input[name="apiUrl"]', el => el.value);
      
      if (apiUrlValue === API_URL) {
        await this.logTest('Settings persistence', 'passed');
      } else {
        await this.logTest('Settings persistence', 'failed', 'Settings not saved');
      }
    } catch (error) {
      await this.logTest('Settings persistence', 'failed', error.message);
    }
  }

  async testLogout() {
    console.log('\n🚪 Testing Logout...');

    try {
      await this.waitAndClick('button:has-text("Logout"), a:has-text("Logout")', 'logout button');
      await this.page.waitForTimeout(2000);
      
      // Check if redirected to login
      const isLoginPage = await this.page.$('input[type="password"]');
      if (isLoginPage) {
        await this.logTest('Logout functionality', 'passed');
        await this.takeScreenshot('after-logout');
      } else {
        await this.logTest('Logout functionality', 'failed', 'Not redirected to login');
      }
    } catch (error) {
      await this.logTest('Logout functionality', 'failed', error.message);
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...\n');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(2);

    const report = {
      summary: {
        totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: `${successRate}%`,
        executionTime: new Date().toISOString(),
        appUrl: APP_URL,
        apiUrl: API_URL
      },
      testResults: this.testResults,
      screenshots: this.screenshots,
      failedTests: this.testResults.filter(r => r.status === 'failed')
    };

    // Save report
    await fs.writeFile(
      join(__dirname, 'e2e-test-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Print summary
    console.log('╔════════════════════════════════════════╗');
    console.log('║        E2E TEST SUMMARY REPORT         ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`\nScreenshots captured: ${this.screenshots.length}`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'failed')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.details}`);
        });
    }

    console.log('\n📄 Full report saved to: e2e-test-report.json');
    console.log('📸 Screenshots saved to: ./screenshots/');

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      
      // Run all test suites
      await this.testAuthentication();
      await this.testNavigation();
      await this.testDashboard();
      await this.testLogsViewer();
      await this.testTerminal();
      await this.testSettings();
      await this.testUserManagement();
      await this.testMonitoring();
      await this.testSecurityCenter();
      await this.testPerformance();
      await this.testResponsiveness();
      await this.testErrorHandling();
      await this.testWebSocketConnection();
      await this.testDataPersistence();
      await this.testLogout();

      // Generate report
      await this.generateReport();

    } catch (error) {
      console.error('Test execution error:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Check if puppeteer is installed
try {
  await import('puppeteer');
} catch (error) {
  console.error('Puppeteer not installed. Installing now...');
  const { execSync } = await import('child_process');
  execSync('npm install puppeteer', { stdio: 'inherit' });
}

// Run the tests
const tester = new ShimmyServeE2ETester();
await tester.run();