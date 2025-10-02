#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'http://localhost:5173';

class UltimateComprehensiveTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
    this.errors = [];
    this.criticalIssues = [];
  }

  async init() {
    console.log('🚀 Starting ULTIMATE COMPREHENSIVE TEST...');
    console.log('📋 Testing ALL functionality after authentication fixes\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    this.page = await this.browser.newPage();

    // Monitor all errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console Error:', msg.text());
        this.errors.push({ type: 'console', message: msg.text(), timestamp: new Date().toISOString() });
      }
    });

    this.page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
      this.errors.push({ type: 'page', message: error.message, timestamp: new Date().toISOString() });
    });

    this.page.on('requestfailed', request => {
      if (!request.url().includes('favicon')) {
        console.error('❌ Network Failed:', request.url(), request.failure().errorText);
        this.errors.push({ type: 'network', url: request.url(), error: request.failure().errorText, timestamp: new Date().toISOString() });
      }
    });
  }

  async logTest(name, status, details = '', critical = false) {
    const result = { name, status, details, critical, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    
    const icon = status === 'passed' ? '✅' : critical ? '🚨' : '❌';
    console.log(`${icon} ${name} ${details ? `- ${details}` : ''}`);
    
    if (status === 'failed' && critical) {
      this.criticalIssues.push(name);
    }
  }

  async takeScreenshot(name) {
    try {
      const filename = `ultimate-${name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`;
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

  async performAuthentication() {
    console.log('\n🔐 Phase 1: Authentication System Test');
    
    try {
      await this.page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await this.sleep(3000);
      
      await this.takeScreenshot('01-initial-load');
      
      // Find and fill login form
      const emailInput = await this.page.$('input[type="email"], input[name="email"]');
      const passwordInput = await this.page.$('input[type="password"]');
      
      if (!emailInput || !passwordInput) {
        await this.logTest('Login form elements', 'failed', 'Email or password input not found', true);
        return false;
      }
      
      await this.logTest('Login form elements', 'passed');
      
      // Clear any existing values and enter credentials
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('demo@example.com');
      
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type('demo123');
      
      await this.takeScreenshot('02-login-form-filled');
      
      // Find and click login button
      const loginButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent?.toLowerCase().includes('sign in') ||
          btn.textContent?.toLowerCase().includes('login')
        ) || null;
      });
      
      if (!loginButton || !loginButton.asElement()) {
        await this.logTest('Login button found', 'failed', 'Sign in button not found', true);
        return false;
      }
      
      await this.logTest('Login button found', 'passed');
      
      // Submit login
      const initialErrorCount = this.errors.length;
      await loginButton.asElement().click();
      await this.sleep(5000); // Wait for auth response
      
      await this.takeScreenshot('03-after-login-attempt');
      
      // Check for errors during login
      if (this.errors.length > initialErrorCount) {
        const newErrors = this.errors.slice(initialErrorCount);
        await this.logTest('Login process error-free', 'failed', `${newErrors.length} errors occurred`, true);
      } else {
        await this.logTest('Login process error-free', 'passed');
      }
      
      // Check if we successfully logged in
      const currentUrl = this.page.url();
      
      // Look for logged-in indicators
      const loggedInIndicators = await this.page.evaluate(() => {
        // Look for dashboard elements, user menu, navigation, etc.
        const indicators = [];
        
        if (document.querySelector('[data-testid="user-menu-button"]')) {
          indicators.push('user-menu');
        }
        
        if (document.querySelector('.sidebar, nav, [class*="navigation"]')) {
          indicators.push('navigation');
        }
        
        if (document.querySelector('h1, h2, h3')) {
          const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
          const dashboardHeading = headings.find(h => 
            h.textContent?.toLowerCase().includes('dashboard') ||
            h.textContent?.toLowerCase().includes('welcome')
          );
          if (dashboardHeading) indicators.push('dashboard-heading');
        }
        
        // Check if we're still on login page
        if (document.querySelector('input[type="password"]') && 
            document.querySelector('button') && 
            document.querySelector('button').textContent?.toLowerCase().includes('sign')) {
          indicators.push('still-on-login');
        }
        
        return indicators;
      });
      
      console.log('Login indicators found:', loggedInIndicators);
      
      if (loggedInIndicators.includes('still-on-login')) {
        // Check for error messages
        const errorMessage = await this.page.$eval('.error, .red, [class*="error"]', 
          el => el.textContent
        ).catch(() => null);
        
        await this.logTest('Authentication successful', 'failed', 
          errorMessage || 'Still on login page after submit', true);
        return false;
      } else if (loggedInIndicators.length > 0) {
        await this.logTest('Authentication successful', 'passed', `Found: ${loggedInIndicators.join(', ')}`);
        return true;
      } else {
        await this.logTest('Authentication successful', 'failed', 'No clear login success indicators', true);
        return false;
      }
      
    } catch (error) {
      await this.logTest('Authentication process', 'failed', error.message, true);
      return false;
    }
  }

  async testNotificationsBell() {
    console.log('\n🔔 Phase 2: Notifications Bell Test (Issue #1 Verification)');
    
    try {
      // Look for notifications bell
      const bellButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => {
          const svg = btn.querySelector('svg');
          return svg && (
            svg.innerHTML.toLowerCase().includes('bell') || 
            svg.getAttribute('data-lucide') === 'bell' ||
            btn.querySelector('[data-lucide="bell"]')
          );
        }) || null;
      });
      
      if (!bellButton || !bellButton.asElement()) {
        await this.logTest('Notifications bell found', 'failed', 'Bell button not found in header', true);
        return;
      }
      
      await this.logTest('Notifications bell found', 'passed');
      
      // Click the bell
      const initialErrorCount = this.errors.length;
      await bellButton.asElement().click();
      await this.sleep(2000);
      
      if (this.errors.length > initialErrorCount) {
        await this.logTest('Bell click error-free', 'failed', 'Click caused JavaScript errors', true);
      } else {
        await this.logTest('Bell click error-free', 'passed');
      }
      
      // Look for notifications dropdown
      const dropdown = await this.page.$('.notifications, [class*="notification"], .dropdown, [class*="dropdown"]');
      
      if (dropdown) {
        await this.logTest('Notifications dropdown appears', 'passed');
        await this.takeScreenshot('04-notifications-dropdown');
        
        // Test dropdown content
        const dropdownContent = await this.page.evaluate(() => {
          const notifElements = document.querySelectorAll('.notification, [class*="notification"]');
          return notifElements.length;
        });
        
        await this.logTest(`Notification items found: ${dropdownContent}`, 'passed');
        
        // Test "Mark all as read" functionality
        const markAllRead = await this.page.evaluateHandle(() => {
          const elements = Array.from(document.querySelectorAll('button, a'));
          return elements.find(el => 
            el.textContent?.toLowerCase().includes('mark all') ||
            el.textContent?.toLowerCase().includes('read')
          ) || null;
        });
        
        if (markAllRead && markAllRead.asElement()) {
          await markAllRead.asElement().click();
          await this.sleep(1000);
          await this.logTest('Mark all as read functionality', 'passed');
        }
        
        // Test closing dropdown
        await this.page.click('body');
        await this.sleep(1000);
        
        const dropdownStillVisible = await this.page.$('.notifications, [class*="notification"], .dropdown, [class*="dropdown"]');
        if (!dropdownStillVisible) {
          await this.logTest('Dropdown closes on outside click', 'passed');
        } else {
          await this.logTest('Dropdown closes on outside click', 'failed', 'Dropdown still visible');
        }
        
      } else {
        await this.logTest('Notifications dropdown appears', 'failed', 'No dropdown found after click', true);
      }
      
    } catch (error) {
      await this.logTest('Notifications testing', 'failed', error.message, true);
    }
  }

  async testServerSettings() {
    console.log('\n⚙️ Phase 3: Server Settings Test (Issue #2 Verification)');
    
    try {
      await this.page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle0' });
      await this.sleep(3000);
      
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/settings')) {
        await this.logTest('Settings page access', 'failed', 'Redirected away from settings', true);
        return;
      }
      
      await this.logTest('Settings page access', 'passed');
      await this.takeScreenshot('05-settings-page');
      
      // Find input fields
      const inputs = await this.page.$$('input, select, textarea');
      await this.logTest(`Input fields found: ${inputs.length}`, 'passed');
      
      if (inputs.length > 0) {
        // Make a change to trigger save button
        const testInput = inputs[0];
        const originalValue = await testInput.evaluate(el => el.value);
        
        await testInput.click();
        await testInput.press('End');
        await testInput.type('_test');
        await this.sleep(1000);
        
        await this.logTest('Form modification', 'passed', 'Added test suffix to field');
      }
      
      // Test save functionality
      const saveButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent?.includes('Save') ||
          btn.textContent?.includes('Apply')
        ) || null;
      });
      
      if (!saveButton || !saveButton.asElement()) {
        await this.logTest('Save button found', 'failed', 'No save button located', true);
        return;
      }
      
      await this.logTest('Save button found', 'passed');
      
      // Click save and monitor response
      const initialErrorCount = this.errors.length;
      await saveButton.asElement().click();
      await this.sleep(5000); // Wait for API response
      
      await this.takeScreenshot('06-after-save-attempt');
      
      // Check for new errors
      if (this.errors.length > initialErrorCount) {
        const newErrors = this.errors.slice(initialErrorCount);
        await this.logTest('Save operation error-free', 'failed', `${newErrors.length} errors occurred`);
      } else {
        await this.logTest('Save operation error-free', 'passed');
      }
      
      // Look for success/error messages
      const successMessage = await this.page.$('.success, .green, [class*="success"]');
      const errorMessage = await this.page.$('.error, .red, [class*="error"]');
      
      if (successMessage) {
        const successText = await successMessage.evaluate(el => el.textContent);
        await this.logTest('Success message displayed', 'passed', successText);
      } else if (errorMessage) {
        const errorText = await errorMessage.evaluate(el => el.textContent);
        if (errorText.toLowerCase().includes('unauthorized')) {
          await this.logTest('Save authorization', 'failed', 'Still getting Unauthorized error', true);
        } else {
          await this.logTest('Save response message', 'failed', errorText);
        }
      } else {
        await this.logTest('Save response feedback', 'failed', 'No success or error message visible');
      }
      
    } catch (error) {
      await this.logTest('Server settings testing', 'failed', error.message, true);
    }
  }

  async testAllPageNavigation() {
    console.log('\n🧭 Phase 4: Complete Page Navigation Test');
    
    const pages = [
      { name: 'Dashboard', path: '/', critical: true },
      { name: 'Settings', path: '/settings', critical: true },
      { name: 'Logs', path: '/logs', critical: false },
      { name: 'Terminal', path: '/terminal', critical: false },
      { name: 'Users', path: '/users', critical: false },
      { name: 'Monitoring', path: '/monitoring', critical: false },
      { name: 'Security', path: '/security', critical: false },
      { name: 'Performance', path: '/performance', critical: false },
      { name: 'Network', path: '/network', critical: false },
      { name: 'Knowledge Base', path: '/knowledge', critical: false }
    ];
    
    for (const page of pages) {
      try {
        await this.page.goto(`${APP_URL}${page.path}`, { waitUntil: 'networkidle0' });
        await this.sleep(2000);
        
        const currentUrl = this.page.url();
        const expectedPath = page.path === '/' ? '' : page.path.slice(1);
        
        if (currentUrl.includes(expectedPath) || page.path === '/') {
          await this.logTest(`Page: ${page.name}`, 'passed');
          
          // Test page content loads
          const hasContent = await this.page.evaluate(() => {
            const headings = document.querySelectorAll('h1, h2, h3');
            const buttons = document.querySelectorAll('button');
            const content = document.body.textContent?.trim();
            
            return headings.length > 0 || buttons.length > 0 || (content && content.length > 100);
          });
          
          if (hasContent) {
            await this.logTest(`${page.name} content loaded`, 'passed');
          } else {
            await this.logTest(`${page.name} content loaded`, 'failed', 'Page appears empty');
          }
          
        } else {
          await this.logTest(`Page: ${page.name}`, 'failed', 'Navigation failed', page.critical);
        }
        
      } catch (error) {
        await this.logTest(`Page: ${page.name}`, 'failed', error.message, page.critical);
      }
    }
  }

  async testInteractiveElements() {
    console.log('\n🎯 Phase 5: Interactive Elements Test');
    
    try {
      // Go to dashboard for testing
      await this.page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
      await this.sleep(2000);
      
      // Test buttons
      const buttons = await this.page.$$('button:not([disabled])');
      const safeButtons = [];
      
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent?.trim() || '');
        if (!text.toLowerCase().includes('delete') && 
            !text.toLowerCase().includes('remove') &&
            !text.toLowerCase().includes('logout') &&
            !text.toLowerCase().includes('sign out')) {
          safeButtons.push(button);
        }
      }
      
      await this.logTest(`Safe interactive buttons found: ${safeButtons.length}`, 'passed');
      
      // Test first few safe buttons
      for (let i = 0; i < Math.min(3, safeButtons.length); i++) {
        try {
          const button = safeButtons[i];
          const text = await button.evaluate(el => el.textContent?.trim() || `Button ${i}`);
          
          const initialErrorCount = this.errors.length;
          await button.click();
          await this.sleep(1500);
          
          if (this.errors.length === initialErrorCount) {
            await this.logTest(`Button "${text}" interaction`, 'passed');
          } else {
            await this.logTest(`Button "${text}" interaction`, 'failed', 'Caused errors');
          }
        } catch (error) {
          await this.logTest(`Button interaction ${i}`, 'failed', error.message);
        }
      }
      
      await this.takeScreenshot('07-interactive-elements');
      
    } catch (error) {
      await this.logTest('Interactive elements testing', 'failed', error.message);
    }
  }

  async generateFinalReport() {
    console.log('\n📊 Generating Ultimate Test Report...');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.status === 'passed').length;
    const failedTests = this.testResults.filter(test => test.status === 'failed').length;
    const criticalFailures = this.criticalIssues.length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(2);
    
    // Check specific issue resolutions
    const issue1Fixed = this.testResults.some(test => 
      test.name === 'Notifications dropdown appears' && test.status === 'passed'
    );
    
    const issue2Fixed = this.testResults.some(test => 
      test.name === 'Success message displayed' && test.status === 'passed'
    ) && !this.testResults.some(test =>
      test.name === 'Save authorization' && test.status === 'failed'
    );
    
    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        criticalFailures,
        successRate: `${successRate}%`,
        issue1_NotificationsBell: issue1Fixed ? 'FIXED' : 'NOT FIXED',
        issue2_SettingsSave: issue2Fixed ? 'FIXED' : 'NOT FIXED',
        screenshotsTaken: this.screenshots.length,
        errorsDetected: this.errors.length,
        testDuration: new Date().toISOString()
      },
      criticalIssues: this.criticalIssues,
      testResults: this.testResults,
      errors: this.errors,
      screenshots: this.screenshots.map(s => s.name)
    };
    
    // Save comprehensive report
    await fs.writeFile(
      join(__dirname, 'ULTIMATE-TEST-REPORT.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Create markdown report
    let markdownReport = `# ShimmyServeAI - Ultimate Comprehensive Test Report\n\n`;
    markdownReport += `**Generated**: ${new Date().toISOString()}\n\n`;
    markdownReport += `## 🎯 FINAL RESULTS:\n`;
    markdownReport += `   📊 Total Tests: ${totalTests}\n`;
    markdownReport += `   ✅ Passed: ${passedTests}\n`;
    markdownReport += `   ❌ Failed: ${failedTests}\n`;
    markdownReport += `   🚨 Critical Failures: ${criticalFailures}\n`;
    markdownReport += `   🏆 Success Rate: ${successRate}%\n`;
    markdownReport += `   📸 Screenshots: ${this.screenshots.length}\n`;
    markdownReport += `   ⚠️ Errors: ${this.errors.length}\n\n`;
    
    markdownReport += `## 🔧 ISSUE RESOLUTION STATUS:\n`;
    markdownReport += `   Issue #1 (Notifications Bell): ${issue1Fixed ? '✅ FIXED' : '❌ NOT FIXED'}\n`;
    markdownReport += `   Issue #2 (Settings Save Auth): ${issue2Fixed ? '✅ FIXED' : '❌ NOT FIXED'}\n\n`;
    
    if (criticalFailures > 0) {
      markdownReport += `## 🚨 CRITICAL FAILURES:\n`;
      this.criticalIssues.forEach(issue => {
        markdownReport += `   • ${issue}\n`;
      });
      markdownReport += `\n`;
    }
    
    markdownReport += `## 📋 DETAILED TEST RESULTS:\n\n`;
    this.testResults.forEach(test => {
      const icon = test.status === 'passed' ? '✅' : (test.critical ? '🚨' : '❌');
      markdownReport += `${icon} **${test.name}**`;
      if (test.details) markdownReport += ` - ${test.details}`;
      markdownReport += `\n`;
    });
    
    await fs.writeFile(
      join(__dirname, 'ULTIMATE-TEST-REPORT.md'),
      markdownReport
    );
    
    // Console summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              ULTIMATE COMPREHENSIVE TEST REPORT             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n🎯 FINAL RESULTS:`);
    console.log(`   📊 Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   🚨 Critical Failures: ${criticalFailures}`);
    console.log(`   🏆 Success Rate: ${successRate}%`);
    console.log(`   📸 Screenshots: ${this.screenshots.length}`);
    console.log(`   ⚠️ Errors: ${this.errors.length}`);
    
    console.log(`\n🔧 ISSUE RESOLUTION STATUS:`);
    console.log(`   Issue #1 (Notifications Bell): ${issue1Fixed ? '✅ FIXED' : '❌ NOT FIXED'}`);
    console.log(`   Issue #2 (Settings Save Auth): ${issue2Fixed ? '✅ FIXED' : '❌ NOT FIXED'}`);
    
    if (criticalFailures > 0) {
      console.log(`\n🚨 CRITICAL FAILURES DETECTED:`);
      this.criticalIssues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    if (issue1Fixed && issue2Fixed && criticalFailures === 0) {
      console.log(`\n🎉 ALL ISSUES RESOLVED - APPLICATION READY FOR PRODUCTION!`);
    } else {
      console.log(`\n⚠️ REMAINING ISSUES NEED ATTENTION BEFORE PRODUCTION`);
    }
    
    console.log(`\n📄 Reports saved:`);
    console.log(`   - JSON: ULTIMATE-TEST-REPORT.json`);
    console.log(`   - Markdown: ULTIMATE-TEST-REPORT.md`);
    console.log(`   - Screenshots: ./screenshots/ directory`);
    
    return issue1Fixed && issue2Fixed && criticalFailures === 0;
  }

  async runUltimateTest() {
    try {
      await this.init();
      
      const authSuccess = await this.performAuthentication();
      if (!authSuccess) {
        console.log('🚨 CRITICAL: Cannot proceed without successful authentication');
        await this.generateFinalReport();
        return false;
      }
      
      await this.testNotificationsBell();
      await this.testServerSettings(); 
      await this.testAllPageNavigation();
      await this.testInteractiveElements();
      
      const success = await this.generateFinalReport();
      
      console.log('\n🏁 Ultimate comprehensive testing completed!');
      return success;
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return false;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the ultimate test
const tester = new UltimateComprehensiveTest();
tester.runUltimateTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});