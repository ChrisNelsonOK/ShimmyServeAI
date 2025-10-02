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
    try {
      const filename = `screenshot-${name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`;
      const filepath = join(__dirname, 'screenshots', filename);
      
      // Create screenshots directory if it doesn't exist
      await fs.mkdir(join(__dirname, 'screenshots'), { recursive: true });
      
      await this.page.screenshot({ path: filepath, fullPage: true });
      this.screenshots.push({ name, filepath });
      console.log(`📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.error(`Screenshot failed for ${name}:`, error.message);
    }
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
      await this.page.clear(selector);
      await this.page.type(selector, text);
      await this.logTest(`Type in ${description}`, 'passed');
      return true;
    } catch (error) {
      await this.logTest(`Type in ${description}`, 'failed', error.message);
      return false;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication Flow...');
    
    // Navigate to app
    await this.page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await this.takeScreenshot('login-page');

    // Test login form elements
    const hasEmailField = await this.page.$('input[type="email"], input[name="email"], input[name="username"]');
    const hasPasswordField = await this.page.$('input[type="password"]');
    const hasLoginButton = await this.page.$('button[type="submit"], button:contains("Login"), button:contains("Sign In")');

    if (hasEmailField && hasPasswordField && hasLoginButton) {
      await this.logTest('Login form elements present', 'passed');
    } else {
      await this.logTest('Login form elements', 'failed', 'Missing form elements');
      return;
    }

    // Test login
    await this.page.type('input[type="email"], input[name="email"], input[name="username"]', DEMO_USER);
    await this.logTest('Enter email', 'passed');
    
    await this.page.type('input[type="password"]', DEMO_PASSWORD);
    await this.logTest('Enter password', 'passed');

    await this.page.click('button[type="submit"]');
    await this.logTest('Click login button', 'passed');

    // Wait for navigation or dashboard
    try {
      await this.page.waitForFunction(() => {
        return document.location.pathname !== '/' || 
               document.querySelector('h1') && document.querySelector('h1').textContent.includes('Dashboard');
      }, { timeout: 15000 });
      await this.logTest('Login successful - Dashboard loaded', 'passed');
      await this.takeScreenshot('dashboard-after-login');
    } catch (error) {
      await this.logTest('Login navigation', 'failed', 'Did not navigate to dashboard');
    }
  }

  async testNavigation() {
    console.log('\n🧭 Testing Navigation...');

    // Get current URL to ensure we're on the right page
    const currentUrl = this.page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Find navigation links
    const navLinks = await this.page.$$eval('a, button', elements => 
      elements.map(el => ({
        text: el.textContent.trim(),
        href: el.href || el.getAttribute('data-href') || 'button',
        tag: el.tagName.toLowerCase()
      })).filter(link => 
        link.text.length > 0 && 
        ['Dashboard', 'Logs', 'Terminal', 'Settings', 'Users', 'Security', 'Monitoring', 'Performance'].some(keyword => 
          link.text.includes(keyword)
        )
      )
    );

    console.log(`Found ${navLinks.length} navigation elements:`, navLinks.map(link => link.text));

    for (const link of navLinks.slice(0, 8)) { // Test first 8 navigation items
      try {
        const selector = `a:contains("${link.text}"), button:contains("${link.text}")`;
        const element = await this.page.$(`text="${link.text}"`);
        
        if (element) {
          await element.click();
          await this.sleep(2000); // Wait for navigation
          await this.logTest(`Navigate to ${link.text}`, 'passed');
          await this.takeScreenshot(link.text.toLowerCase().replace(/\s+/g, '-'));
        } else {
          await this.logTest(`Navigate to ${link.text}`, 'failed', 'Element not found');
        }
      } catch (error) {
        await this.logTest(`Navigate to ${link.text}`, 'failed', error.message);
      }
    }
  }

  async testDashboard() {
    console.log('\n📊 Testing Dashboard Features...');
    
    // Navigate to dashboard
    await this.page.goto(`${APP_URL}`, { waitUntil: 'networkidle0' });
    await this.sleep(3000);

    // Look for metric cards or data displays
    const metricCards = await this.page.$$eval('div', elements => 
      elements.filter(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('cpu') || text.includes('memory') || 
               text.includes('disk') || text.includes('network') ||
               text.includes('%') || text.includes('mb') || text.includes('gb');
      }).length
    );

    if (metricCards > 0) {
      await this.logTest(`Found ${metricCards} metric displays`, 'passed');
    } else {
      await this.logTest('Dashboard metrics', 'failed', 'No metric cards found');
    }

    // Test for charts or visual elements
    const charts = await this.page.$$('canvas, svg, .chart');
    if (charts.length > 0) {
      await this.logTest(`Found ${charts.length} charts/visual elements`, 'passed');
    } else {
      await this.logTest('Dashboard charts', 'failed', 'No charts found');
    }

    await this.takeScreenshot('dashboard-analysis');
  }

  async testInteractiveElements() {
    console.log('\n🎯 Testing Interactive Elements...');

    // Find all buttons
    const buttons = await this.page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent.trim(),
        disabled: btn.disabled,
        type: btn.type
      })).filter(btn => btn.text.length > 0)
    );

    await this.logTest(`Found ${buttons.length} buttons`, 'passed');
    console.log('Buttons found:', buttons.slice(0, 10).map(btn => btn.text));

    // Find all links
    const links = await this.page.$$eval('a', links => 
      links.map(link => ({
        text: link.textContent.trim(),
        href: link.href
      })).filter(link => link.text.length > 0)
    );

    await this.logTest(`Found ${links.length} links`, 'passed');
    console.log('Links found:', links.slice(0, 10).map(link => link.text));

    // Find all form inputs
    const inputs = await this.page.$$eval('input, select, textarea', inputs => 
      inputs.map(input => ({
        type: input.type,
        name: input.name,
        placeholder: input.placeholder
      }))
    );

    await this.logTest(`Found ${inputs.length} form inputs`, 'passed');
    console.log('Inputs found:', inputs.slice(0, 10));

    // Test clicking some non-destructive buttons
    const safeButtons = await this.page.$$('button:not([type="submit"]):not(:contains("Delete")):not(:contains("Remove"))');
    
    for (let i = 0; i < Math.min(3, safeButtons.length); i++) {
      try {
        const buttonText = await safeButtons[i].textContent();
        await safeButtons[i].click();
        await this.sleep(1000);
        await this.logTest(`Clicked button: ${buttonText}`, 'passed');
      } catch (error) {
        await this.logTest(`Click button ${i}`, 'failed', error.message);
      }
    }
  }

  async testAPIMethods() {
    console.log('\n🔌 Testing API Connectivity...');

    // Test API endpoints
    const apiTests = [
      { endpoint: '/health', method: 'GET', description: 'Health check' },
      { endpoint: '/api/auth/login', method: 'POST', description: 'Auth endpoint', 
        body: { email: DEMO_USER, password: DEMO_PASSWORD } }
    ];

    for (const test of apiTests) {
      try {
        const response = await this.page.evaluate(async (test) => {
          const options = {
            method: test.method,
            headers: { 'Content-Type': 'application/json' }
          };
          
          if (test.body) {
            options.body = JSON.stringify(test.body);
          }

          const res = await fetch(`http://localhost:3001${test.endpoint}`, options);
          return {
            status: res.status,
            ok: res.ok,
            statusText: res.statusText
          };
        }, test);

        if (response.ok) {
          await this.logTest(`API ${test.description} (${test.method})`, 'passed', `Status: ${response.status}`);
        } else {
          await this.logTest(`API ${test.description} (${test.method})`, 'failed', `Status: ${response.status}`);
        }
      } catch (error) {
        await this.logTest(`API ${test.description}`, 'failed', error.message);
      }
    }
  }

  async testPageRoutes() {
    console.log('\n🛣️ Testing Page Routes...');

    const routes = [
      { path: '/', name: 'Home/Dashboard' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/logs', name: 'Logs' },
      { path: '/terminal', name: 'Terminal' },
      { path: '/settings', name: 'Settings' },
      { path: '/users', name: 'Users' },
      { path: '/monitoring', name: 'Monitoring' },
      { path: '/security', name: 'Security' }
    ];

    for (const route of routes) {
      try {
        const response = await this.page.goto(`${APP_URL}${route.path}`, { 
          waitUntil: 'networkidle0',
          timeout: 10000 
        });
        
        if (response && response.status() < 400) {
          await this.logTest(`Route ${route.name} (${route.path})`, 'passed', `Status: ${response.status()}`);
          await this.takeScreenshot(`route-${route.name.toLowerCase()}`);
        } else {
          await this.logTest(`Route ${route.name} (${route.path})`, 'failed', `Status: ${response ? response.status() : 'No response'}`);
        }
        
        await this.sleep(1000);
      } catch (error) {
        await this.logTest(`Route ${route.name} (${route.path})`, 'failed', error.message);
      }
    }
  }

  async testResponsiveness() {
    console.log('\n📱 Testing Responsive Design...');

    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await this.page.setViewport({ width: viewport.width, height: viewport.height });
      await this.page.goto(`${APP_URL}`, { waitUntil: 'networkidle0' });
      await this.sleep(1000);
      
      // Check if content is visible and properly formatted
      const isVisible = await this.page.evaluate(() => {
        return document.body.offsetWidth > 0 && document.body.offsetHeight > 0;
      });
      
      if (isVisible) {
        await this.logTest(`${viewport.name} viewport (${viewport.width}x${viewport.height})`, 'passed');
        await this.takeScreenshot(`responsive-${viewport.name.toLowerCase()}`);
      } else {
        await this.logTest(`${viewport.name} viewport`, 'failed', 'Content not visible');
      }
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
      await this.testInteractiveElements();
      await this.testAPIMethods();
      await this.testPageRoutes();
      await this.testResponsiveness();

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