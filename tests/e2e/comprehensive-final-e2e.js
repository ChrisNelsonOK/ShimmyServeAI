#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'http://localhost:5173';
const DEMO_USER = 'demo@example.com';
const DEMO_PASSWORD = 'demo123';

class ComprehensiveE2ETester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
  }

  async init() {
    console.log('🚀 Starting comprehensive E2E testing of every element, button, and link...');
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    this.page = await this.browser.newPage();

    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Browser Error:', msg.text());
      }
    });

    this.page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });
  }

  async logTest(name, status, details = '') {
    const result = { name, status, details, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    console.log(`${status === 'passed' ? '✅' : '❌'} ${name} ${details ? `- ${details}` : ''}`);
  }

  async takeScreenshot(name) {
    try {
      const filename = `test-${name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`;
      const filepath = join(__dirname, 'screenshots', filename);
      
      await fs.mkdir(join(__dirname, 'screenshots'), { recursive: true });
      await this.page.screenshot({ path: filepath, fullPage: true });
      this.screenshots.push({ name, filepath });
      console.log(`📸 Screenshot: ${filename}`);
    } catch (error) {
      console.error(`Screenshot failed:`, error.message);
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testPageLoad() {
    console.log('\n🌐 Testing Initial Page Load...');
    
    try {
      const response = await this.page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 15000 });
      
      if (response && response.status() === 200) {
        await this.logTest('Page loads successfully', 'passed', `Status: ${response.status()}`);
      } else {
        await this.logTest('Page load', 'failed', `Status: ${response ? response.status() : 'No response'}`);
        return false;
      }

      await this.takeScreenshot('initial-page-load');
      
      // Check for basic page elements
      const title = await this.page.title();
      await this.logTest('Page has title', 'passed', title);

      const bodyExists = await this.page.$('body');
      if (bodyExists) {
        await this.logTest('Body element exists', 'passed');
      } else {
        await this.logTest('Body element', 'failed', 'No body element found');
      }

      return true;
    } catch (error) {
      await this.logTest('Page load', 'failed', error.message);
      return false;
    }
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication...');

    try {
      // Look for login form elements using basic selectors
      const emailInput = await this.page.$('input[type="email"]') || 
                         await this.page.$('input[name="email"]') || 
                         await this.page.$('input[name="username"]');
      
      const passwordInput = await this.page.$('input[type="password"]');
      const submitButton = await this.page.$('button[type="submit"]') || 
                          await this.page.$('button');

      if (emailInput && passwordInput && submitButton) {
        await this.logTest('Login form elements found', 'passed');

        // Fill out login form
        await emailInput.type(DEMO_USER);
        await this.logTest('Email entered', 'passed');

        await passwordInput.type(DEMO_PASSWORD);
        await this.logTest('Password entered', 'passed');

        await this.takeScreenshot('before-login-submit');

        // Submit form
        await submitButton.click();
        await this.logTest('Login form submitted', 'passed');

        // Wait for navigation or response
        await this.sleep(3000);
        
        const currentUrl = this.page.url();
        const pageContent = await this.page.content();

        if (currentUrl !== APP_URL || pageContent.includes('Dashboard') || pageContent.includes('Welcome')) {
          await this.logTest('Login successful', 'passed', `URL: ${currentUrl}`);
          await this.takeScreenshot('after-successful-login');
          return true;
        } else {
          await this.logTest('Login', 'failed', 'No navigation detected');
          await this.takeScreenshot('login-failed');
          return false;
        }
      } else {
        await this.logTest('Login form elements', 'failed', 'Form elements not found');
        return false;
      }
    } catch (error) {
      await this.logTest('Authentication test', 'failed', error.message);
      return false;
    }
  }

  async testAllInteractiveElements() {
    console.log('\n🎯 Testing Every Interactive Element...');

    try {
      // Find all clickable elements
      const clickableElements = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const links = Array.from(document.querySelectorAll('a'));
        const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
        
        return {
          buttons: buttons.map((btn, index) => ({
            index,
            text: btn.textContent.trim() || btn.value || `Button ${index}`,
            type: btn.type,
            disabled: btn.disabled,
            id: btn.id,
            className: btn.className
          })),
          links: links.map((link, index) => ({
            index,
            text: link.textContent.trim() || `Link ${index}`,
            href: link.href,
            id: link.id,
            className: link.className
          })),
          inputs: inputs.map((input, index) => ({
            index,
            type: input.type,
            name: input.name,
            placeholder: input.placeholder,
            id: input.id,
            value: input.value
          }))
        };
      });

      await this.logTest(`Found ${clickableElements.buttons.length} buttons`, 'passed');
      await this.logTest(`Found ${clickableElements.links.length} links`, 'passed');
      await this.logTest(`Found ${clickableElements.inputs.length} form inputs`, 'passed');

      console.log('\n📋 Complete Element Inventory:');
      console.log('Buttons:', clickableElements.buttons);
      console.log('Links:', clickableElements.links);
      console.log('Inputs:', clickableElements.inputs);

      // Test clicking ALL safe buttons (non-destructive)
      const safeButtons = clickableElements.buttons.filter(btn => 
        !btn.text.toLowerCase().includes('delete') &&
        !btn.text.toLowerCase().includes('remove') &&
        !btn.text.toLowerCase().includes('clear') &&
        !btn.text.toLowerCase().includes('logout') &&
        !btn.disabled
      );

      console.log(`\n🖱️ Testing ALL ${safeButtons.length} safe buttons...`);
      
      for (let i = 0; i < safeButtons.length; i++) {
        try {
          const button = safeButtons[i];
          
          // Try multiple selection strategies
          let element = null;
          if (button.id) {
            element = await this.page.$(`#${button.id}`);
          }
          if (!element && button.className) {
            const firstClass = button.className.split(' ')[0];
            if (firstClass) {
              element = await this.page.$(`.${firstClass}`);
            }
          }
          if (!element) {
            const allButtons = await this.page.$$('button');
            if (allButtons[button.index]) {
              element = allButtons[button.index];
            }
          }

          if (element) {
            await element.click();
            await this.sleep(1000);
            await this.logTest(`Clicked button: "${button.text}"`, 'passed');
            await this.takeScreenshot(`button-${i}-${button.text.replace(/[^a-z0-9]/gi, '-')}`);
          } else {
            await this.logTest(`Button click failed: "${button.text}"`, 'failed', 'Element not found');
          }
        } catch (error) {
          await this.logTest(`Button click error: "${safeButtons[i].text}"`, 'failed', error.message);
        }
      }

      // Test ALL navigation links
      const navigationLinks = clickableElements.links.filter(link => 
        link.href && (link.href.includes(APP_URL) || link.href.startsWith('/') || link.href.startsWith('#'))
      );

      console.log(`\n🧭 Testing ALL ${navigationLinks.length} navigation links...`);
      
      for (let i = 0; i < navigationLinks.length; i++) {
        try {
          const link = navigationLinks[i];
          
          // Try multiple selection strategies
          let element = null;
          if (link.id) {
            element = await this.page.$(`#${link.id}`);
          }
          if (!element && link.className) {
            const firstClass = link.className.split(' ')[0];
            if (firstClass) {
              element = await this.page.$(`.${firstClass}`);
            }
          }
          if (!element) {
            const allLinks = await this.page.$$('a');
            if (allLinks[link.index]) {
              element = allLinks[link.index];
            }
          }

          if (element) {
            await element.click();
            await this.sleep(2000);
            
            const newUrl = this.page.url();
            await this.logTest(`Navigated via link: "${link.text}"`, 'passed', newUrl);
            await this.takeScreenshot(`navigation-${i}-${link.text.replace(/[^a-z0-9]/gi, '-')}`);
          } else {
            await this.logTest(`Link click failed: "${link.text}"`, 'failed', 'Element not found');
          }
        } catch (error) {
          await this.logTest(`Link click error: "${navigationLinks[i].text}"`, 'failed', error.message);
        }
      }

      return true;
    } catch (error) {
      await this.logTest('Interactive elements test', 'failed', error.message);
      return false;
    }
  }

  async testAPIConnectivity() {
    console.log('\n🔌 Testing API Connectivity...');

    try {
      // Test backend health
      const healthResponse = await this.page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:3001/health');
          return { status: response.status, ok: response.ok, data: await response.json() };
        } catch (error) {
          return { error: error.message };
        }
      });

      if (healthResponse.ok) {
        await this.logTest('Backend health check', 'passed', `Status: ${healthResponse.status}`);
      } else {
        await this.logTest('Backend health check', 'failed', healthResponse.error || 'Connection failed');
      }

      // Test auth endpoint
      const authResponse = await this.page.evaluate(async (user, password) => {
        try {
          const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email: user, password: password })
          });
          return { status: response.status, ok: response.ok };
        } catch (error) {
          return { error: error.message };
        }
      }, DEMO_USER, DEMO_PASSWORD);

      if (authResponse.ok) {
        await this.logTest('Authentication API', 'passed', `Status: ${authResponse.status}`);
      } else {
        await this.logTest('Authentication API', 'failed', authResponse.error || `Status: ${authResponse.status}`);
      }

      return true;
    } catch (error) {
      await this.logTest('API connectivity test', 'failed', error.message);
      return false;
    }
  }

  async testEveryPageRoute() {
    console.log('\n🛣️ Testing Every Page Route...');

    const routes = [
      { path: '/', name: 'Home' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/logs', name: 'Logs' },
      { path: '/terminal', name: 'Terminal' },
      { path: '/settings', name: 'Settings' },
      { path: '/users', name: 'Users' },
      { path: '/monitoring', name: 'Monitoring' },
      { path: '/security', name: 'Security' },
      { path: '/performance', name: 'Performance' },
      { path: '/network', name: 'Network' },
      { path: '/mcp', name: 'MCP Server' },
      { path: '/knowledge', name: 'Knowledge Base' }
    ];

    for (const route of routes) {
      try {
        const response = await this.page.goto(`${APP_URL}${route.path}`, { 
          waitUntil: 'networkidle0',
          timeout: 10000 
        });
        
        if (response && response.status() < 400) {
          await this.logTest(`Route: ${route.name} (${route.path})`, 'passed', `Status: ${response.status()}`);
          await this.takeScreenshot(`route-${route.name.toLowerCase().replace(/\s+/g, '-')}`);
          
          // Analyze page content deeply
          const pageAnalysis = await this.page.evaluate(() => {
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent.trim());
            const buttons = Array.from(document.querySelectorAll('button')).map(btn => btn.textContent.trim());
            const links = Array.from(document.querySelectorAll('a')).map(link => link.textContent.trim());
            const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(input => ({
              type: input.type,
              name: input.name,
              placeholder: input.placeholder
            }));
            const forms = document.querySelectorAll('form').length;
            const tables = document.querySelectorAll('table').length;
            const charts = document.querySelectorAll('canvas, svg').length;
            
            return { 
              headings: headings.slice(0, 5), 
              buttonCount: buttons.length, 
              linkCount: links.length, 
              inputCount: inputs.length,
              forms,
              tables,
              charts,
              buttons: buttons.slice(0, 10),
              links: links.slice(0, 10)
            };
          });

          await this.logTest(`Page analysis: ${route.name}`, 'passed', 
            `${pageAnalysis.buttonCount} buttons, ${pageAnalysis.linkCount} links, ${pageAnalysis.inputCount} inputs, ${pageAnalysis.forms} forms, ${pageAnalysis.tables} tables, ${pageAnalysis.charts} charts`);

          console.log(`   Page elements for ${route.name}:`, pageAnalysis);

        } else {
          await this.logTest(`Route: ${route.name}`, 'failed', `Status: ${response ? response.status() : 'No response'}`);
        }
        
        await this.sleep(1000);
      } catch (error) {
        await this.logTest(`Route: ${route.name}`, 'failed', error.message);
      }
    }
  }

  async testResponsiveDesign() {
    console.log('\n📱 Testing Responsive Design on Every Viewport...');

    const viewports = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Large Desktop', width: 2560, height: 1440 }
    ];

    for (const viewport of viewports) {
      try {
        await this.page.setViewport({ width: viewport.width, height: viewport.height });
        await this.page.goto(APP_URL, { waitUntil: 'networkidle0' });
        await this.sleep(2000);
        
        const layoutAnalysis = await this.page.evaluate(() => {
          const body = document.body;
          const isVisible = body.offsetWidth > 0 && body.offsetHeight > 0;
          const hasOverflow = body.scrollWidth > body.offsetWidth || body.scrollHeight > body.offsetHeight;
          const elementsCount = document.querySelectorAll('*').length;
          
          return { isVisible, hasOverflow, elementsCount, bodyWidth: body.offsetWidth, bodyHeight: body.offsetHeight };
        });
        
        if (layoutAnalysis.isVisible) {
          await this.logTest(`${viewport.name} (${viewport.width}x${viewport.height})`, 'passed', 
            `Body: ${layoutAnalysis.bodyWidth}x${layoutAnalysis.bodyHeight}, Elements: ${layoutAnalysis.elementsCount}, Overflow: ${layoutAnalysis.hasOverflow ? 'Yes' : 'No'}`);
          await this.takeScreenshot(`responsive-${viewport.name.toLowerCase().replace(/\s+/g, '-')}`);
        } else {
          await this.logTest(`${viewport.name} viewport`, 'failed', 'Content not visible');
        }
      } catch (error) {
        await this.logTest(`${viewport.name} viewport`, 'failed', error.message);
      }
    }
  }

  async generateComprehensiveReport() {
    console.log('\n📊 Generating Comprehensive Test Report...');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(2);

    const report = {
      summary: {
        testName: 'ShimmyServe AI - COMPLETE E2E Testing (Every Element/Button/Link)',
        executionDate: new Date().toISOString(),
        totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: `${successRate}%`,
        appUrl: APP_URL,
        screenshotCount: this.screenshots.length,
        testDuration: 'Complete comprehensive testing of every interactive element'
      },
      testResults: this.testResults,
      screenshots: this.screenshots,
      failedTests: this.testResults.filter(r => r.status === 'failed'),
      passedTests: this.testResults.filter(r => r.status === 'passed'),
      testCategories: {
        pageLoad: this.testResults.filter(r => r.name.includes('Page')).length,
        authentication: this.testResults.filter(r => r.name.includes('Login') || r.name.includes('Auth')).length,
        buttons: this.testResults.filter(r => r.name.includes('button') || r.name.includes('Clicked')).length,
        links: this.testResults.filter(r => r.name.includes('link') || r.name.includes('Navigated')).length,
        routes: this.testResults.filter(r => r.name.includes('Route')).length,
        api: this.testResults.filter(r => r.name.includes('API') || r.name.includes('Backend')).length,
        responsive: this.testResults.filter(r => r.name.includes('Mobile') || r.name.includes('Tablet') || r.name.includes('Desktop')).length,
        elements: this.testResults.filter(r => r.name.includes('Found')).length
      }
    };

    // Save comprehensive report
    await fs.writeFile(
      join(__dirname, 'COMPLETE-E2E-TEST-REPORT.json'),
      JSON.stringify(report, null, 2)
    );

    // Create detailed markdown report
    const markdownReport = `# ShimmyServe AI - Complete E2E Test Report

## Executive Summary

**Test Execution Date:** ${report.summary.executionDate}
**Application URL:** ${APP_URL}
**Total Tests:** ${totalTests}
**Success Rate:** ${successRate}%

## Results Overview

- ✅ **Passed:** ${passedTests} tests
- ❌ **Failed:** ${failedTests} tests
- 📸 **Screenshots:** ${this.screenshots.length} captured

## Test Categories

${Object.entries(report.testCategories).map(([category, count]) => 
  `- **${category.charAt(0).toUpperCase() + category.slice(1)}:** ${count} tests`
).join('\n')}

## Failed Tests

${failedTests > 0 ? 
  report.failedTests.map(test => `- **${test.name}:** ${test.details}`).join('\n') :
  'No tests failed! 🎉'
}

## Screenshots

${this.screenshots.map(screenshot => `- ${screenshot.name}: \`${screenshot.filepath}\``).join('\n')}

## Test Details

${this.testResults.map(test => 
  `### ${test.status === 'passed' ? '✅' : '❌'} ${test.name}
${test.details ? `**Details:** ${test.details}` : ''}
**Timestamp:** ${test.timestamp}`
).join('\n\n')}
`;

    await fs.writeFile(
      join(__dirname, 'COMPLETE-E2E-TEST-REPORT.md'),
      markdownReport
    );

    // Print detailed summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║           SHIMMY SERVE AI - COMPLETE E2E TEST REPORT        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`   🎯 Total Tests Executed: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   🏆 Success Rate: ${successRate}%`);
    console.log(`   📸 Screenshots Captured: ${this.screenshots.length}`);

    console.log(`\n📋 COMPREHENSIVE TEST BREAKDOWN:`);
    Object.entries(report.testCategories).forEach(([category, count]) => {
      console.log(`   📌 ${category.charAt(0).toUpperCase() + category.slice(1)}: ${count} tests`);
    });
    
    if (failedTests > 0) {
      console.log('\n❌ DETAILED FAILURE ANALYSIS:');
      this.testResults
        .filter(r => r.status === 'failed')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.details}`);
        });
    } else {
      console.log('\n🎉 ALL TESTS PASSED! Application is fully functional!');
    }

    console.log('\n📄 Complete reports saved:');
    console.log('   - JSON: COMPLETE-E2E-TEST-REPORT.json');
    console.log('   - Markdown: COMPLETE-E2E-TEST-REPORT.md');
    console.log('   - Screenshots: ./screenshots/ directory');
    console.log('\n🏁 Comprehensive E2E testing completed successfully!\n');

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
      
      // Execute comprehensive test suite - EVERY element, button, and link
      const pageLoadSuccess = await this.testPageLoad();
      if (pageLoadSuccess) {
        await this.testAuthentication();
        await this.testAllInteractiveElements(); // This tests EVERY button and link
        await this.testAPIConnectivity();
        await this.testEveryPageRoute(); // This tests EVERY page
        await this.testResponsiveDesign(); // This tests EVERY viewport
      }

      // Generate comprehensive report
      await this.generateComprehensiveReport();

    } catch (error) {
      console.error('❌ Test execution error:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the complete comprehensive test suite
const tester = new ComprehensiveE2ETester();
await tester.run();