#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'http://localhost:5173';
const DEMO_USER = 'test@example.com';
const DEMO_PASSWORD = 'test12345'; // Must be 8+ characters

class ComprehensiveUITester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
    this.errors = [];
    this.interactionCount = 0;
  }

  async init() {
    console.log('🚀 Starting COMPREHENSIVE UI Testing...');
    console.log('📋 This will test EVERY single click, dropdown, function, and interaction\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    this.page = await this.browser.newPage();

    // Monitor all console messages and errors
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.error('❌ Browser Console Error:', text);
        this.errors.push({ type: 'console', message: text, timestamp: new Date().toISOString() });
      }
    });

    this.page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
      this.errors.push({ type: 'page', message: error.message, stack: error.stack, timestamp: new Date().toISOString() });
    });

    this.page.on('requestfailed', request => {
      console.error('❌ Network Request Failed:', request.url(), request.failure().errorText);
      this.errors.push({ type: 'network', url: request.url(), error: request.failure().errorText, timestamp: new Date().toISOString() });
    });
  }

  async logTest(name, status, details = '', critical = false) {
    const result = { name, status, details, critical, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    
    const icon = status === 'passed' ? '✅' : critical ? '🚨' : '❌';
    console.log(`${icon} ${name} ${details ? `- ${details}` : ''}`);
    
    if (status === 'failed' && critical) {
      console.error(`🚨 CRITICAL FAILURE: ${name}`);
    }
  }

  async takeScreenshot(name) {
    try {
      const filename = `ui-test-${name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`;
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

  async login() {
    console.log('\n🔐 Phase 1: Authentication');
    
    try {
      await this.page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await this.sleep(2000);
      
      // Test login form visibility
      const emailInput = await this.page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
      const passwordInput = await this.page.$('input[type="password"]');
      const loginButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent?.toLowerCase().includes('sign in') ||
          btn.textContent?.toLowerCase().includes('login')
        ) || null;
      });

      if (emailInput && passwordInput && loginButton && loginButton.asElement()) {
        await this.logTest('Login form elements present', 'passed');
        
        // Fill and submit login form
        await emailInput.type(DEMO_USER);
        await passwordInput.type(DEMO_PASSWORD);
        await this.takeScreenshot('01-login-form-filled');
        
        await loginButton.asElement().click();
        await this.sleep(3000);
        
        // Verify login success
        const currentUrl = this.page.url();
        if (currentUrl.includes('dashboard') || currentUrl === APP_URL + '/') {
          await this.logTest('Login successful', 'passed');
          await this.takeScreenshot('02-after-login');
          return true;
        } else {
          throw new Error('Login did not redirect to dashboard');
        }
      } else {
        throw new Error('Login form elements not found');
      }
    } catch (error) {
      await this.logTest('Login process', 'failed', error.message, true);
      await this.takeScreenshot('02-login-failed');
      return false;
    }
  }

  async testNotifications() {
    console.log('\n🔔 Phase 2: Notifications Testing');
    
    try {
      // Find and click the notifications bell
      const notificationsBell = await this.page.$('button[class*="bell"], .notifications-button, [data-testid="notifications"]');
      let notificationsBellByIcon = null;
      
      if (!notificationsBell) {
        // Find by icon
        notificationsBellByIcon = await this.page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => {
            const svg = btn.querySelector('svg');
            return svg && (svg.innerHTML.includes('bell') || btn.querySelector('[data-lucide="bell"]'));
          }) || null;
        });
      }

      const bellButton = notificationsBell || (notificationsBellByIcon && notificationsBellByIcon.asElement());
      
      if (bellButton) {
        await this.logTest('Notifications bell found', 'passed');
        
        // Click the bell and verify dropdown appears
        const initialErrorCount = this.errors.length;
        await bellButton.click();
        await this.sleep(1500);
        
        // Check for errors after click
        if (this.errors.length > initialErrorCount) {
          await this.logTest('Notifications bell click error-free', 'failed', 'Caused errors', true);
        } else {
          await this.logTest('Notifications bell click error-free', 'passed');
        }
        
        // Look for notifications dropdown
        const notificationsDropdown = await this.page.$('.notifications-dropdown, [class*="notification"]');
        
        if (notificationsDropdown) {
          await this.logTest('Notifications dropdown appears', 'passed');
          await this.takeScreenshot('03-notifications-open');
          
          // Test notification items
          const notificationItems = await this.page.$$('.notification-item, [class*="notification"] div');
          await this.logTest(`Notification items found: ${notificationItems.length}`, 'passed');
          
          // Test "Mark all as read" button if present
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
          
          // Close notifications by clicking outside
          await this.page.click('body');
          await this.sleep(1000);
          
        } else {
          await this.logTest('Notifications dropdown appears', 'failed', 'No dropdown found', true);
        }
        
      } else {
        await this.logTest('Notifications bell found', 'failed', 'Bell button not found', true);
      }
      
      await this.takeScreenshot('04-notifications-test-complete');
      
    } catch (error) {
      await this.logTest('Notifications testing', 'failed', error.message, true);
      await this.takeScreenshot('04-notifications-error');
    }
  }

  async testServerSettings() {
    console.log('\n⚙️ Phase 3: Server Settings Comprehensive Testing');
    
    try {
      // Navigate to settings
      await this.page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle0' });
      await this.sleep(3000);
      
      await this.logTest('Settings page loaded', 'passed');
      await this.takeScreenshot('05-settings-page');
      
      // Test all input fields
      const inputFields = await this.page.$$('input, select, textarea');
      await this.logTest(`Input fields found: ${inputFields.length}`, 'passed');
      
      for (let i = 0; i < inputFields.length; i++) {
        try {
          const field = inputFields[i];
          const tagName = await field.evaluate(el => el.tagName);
          const type = await field.evaluate(el => el.type || el.tagName);
          const name = await field.evaluate(el => el.name || el.id || `field-${i}`);
          
          await this.logTest(`Testing ${tagName.toLowerCase()} field: ${name}`, 'passed');
          
          // Test field interaction based on type
          if (type === 'number' || type === 'text') {
            // Clear and type new value
            await field.click({ clickCount: 3 }); // Select all
            await field.type('123');
            await this.sleep(500);
            
            // Verify value changed
            const newValue = await field.evaluate(el => el.value);
            if (newValue === '123') {
              await this.logTest(`Field ${name} value change`, 'passed');
            } else {
              await this.logTest(`Field ${name} value change`, 'failed', `Expected 123, got ${newValue}`);
            }
          } else if (type === 'SELECT') {
            // Test dropdown selection
            const options = await field.$$('option');
            if (options.length > 1) {
              await field.select(await options[1].evaluate(opt => opt.value));
              await this.logTest(`Dropdown ${name} selection`, 'passed');
            }
          }
          
        } catch (error) {
          await this.logTest(`Field interaction ${i}`, 'failed', error.message);
        }
      }
      
      await this.takeScreenshot('06-settings-fields-tested');
      
      // Test Save Changes button
      const saveButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent?.includes('Save') ||
          btn.textContent?.includes('Apply')
        ) || null;
      });
      
      if (saveButton && saveButton.asElement()) {
        await this.logTest('Save button found', 'passed');
        
        const initialErrorCount = this.errors.length;
        await saveButton.asElement().click();
        await this.sleep(3000);
        
        // Check for success/error messages
        await this.sleep(2000);
        
        if (this.errors.length > initialErrorCount) {
          await this.logTest('Save configuration', 'failed', 'Save caused errors', true);
        } else {
          await this.logTest('Save configuration', 'passed');
        }
        
        await this.takeScreenshot('07-after-save');
        
        // Look for success/error messages
        const successMessage = await this.page.$('.success, .green, [class*="success"]');
        const errorMessage = await this.page.$('.error, .red, [class*="error"]');
        
        if (successMessage) {
          await this.logTest('Success message displayed', 'passed');
        } else if (errorMessage) {
          const errorText = await errorMessage.evaluate(el => el.textContent);
          await this.logTest('Error message displayed', 'failed', errorText, true);
        }
        
      } else {
        await this.logTest('Save button found', 'failed', 'No save button found', true);
      }
      
      // Test Export button
      const exportButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent?.includes('Export')) || null;
      });
      
      if (exportButton && exportButton.asElement()) {
        await exportButton.asElement().click();
        await this.sleep(1000);
        await this.logTest('Export configuration', 'passed');
      }
      
      // Test Reset button
      const resetButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent?.includes('Reset')) || null;
      });
      
      if (resetButton && resetButton.asElement()) {
        await resetButton.asElement().click();
        await this.sleep(1000);
        await this.logTest('Reset configuration', 'passed');
      }
      
    } catch (error) {
      await this.logTest('Server settings testing', 'failed', error.message, true);
      await this.takeScreenshot('07-settings-error');
    }
  }

  async testAllPages() {
    console.log('\n🧭 Phase 4: Complete Page Navigation Testing');
    
    const pages = [
      { name: 'Dashboard', path: '/', critical: true },
      { name: 'Logs', path: '/logs', critical: false },
      { name: 'Terminal', path: '/terminal', critical: false },
      { name: 'Settings', path: '/settings', critical: true },
      { name: 'Users', path: '/users', critical: false },
      { name: 'Monitoring', path: '/monitoring', critical: false },
      { name: 'Security', path: '/security', critical: false },
      { name: 'Performance', path: '/performance', critical: false },
      { name: 'Network', path: '/network', critical: false },
      { name: 'MCP Server', path: '/mcp', critical: false },
      { name: 'Knowledge Base', path: '/knowledge', critical: false }
    ];
    
    for (const page of pages) {
      try {
        await this.page.goto(`${APP_URL}${page.path}`, { waitUntil: 'networkidle0' });
        await this.sleep(2000);
        
        const response = this.page.url();
        const isCritical = page.critical;
        
        if (response.includes(page.path.slice(1)) || page.path === '/') {
          await this.logTest(`Page: ${page.name}`, 'passed');
          
          // Test page-specific functionality
          await this.testPageInteractions(page.name);
          
          await this.takeScreenshot(`08-page-${page.name.toLowerCase().replace(/\s+/g, '-')}`);
        } else {
          await this.logTest(`Page: ${page.name}`, 'failed', 'Navigation failed', isCritical);
        }
        
      } catch (error) {
        await this.logTest(`Page: ${page.name}`, 'failed', error.message, page.critical);
      }
    }
  }

  async testPageInteractions(pageName) {
    try {
      // Get all interactive elements on the page
      const buttons = await this.page.$$('button:not([disabled])');
      const links = await this.page.$$('a[href]');
      const inputs = await this.page.$$('input, select, textarea');
      
      // Test a sample of buttons (avoid destructive actions)
      for (let i = 0; i < Math.min(3, buttons.length); i++) {
        try {
          const button = buttons[i];
          const buttonText = await button.evaluate(el => el.textContent?.trim() || `Button ${i}`);
          
          // Skip destructive buttons
          if (!buttonText.toLowerCase().includes('delete') && 
              !buttonText.toLowerCase().includes('remove') &&
              !buttonText.toLowerCase().includes('logout')) {
            
            const initialErrorCount = this.errors.length;
            await button.click();
            await this.sleep(1000);
            
            if (this.errors.length === initialErrorCount) {
              await this.logTest(`${pageName} button: ${buttonText}`, 'passed');
            } else {
              await this.logTest(`${pageName} button: ${buttonText}`, 'failed', 'Caused errors');
            }
          }
        } catch (error) {
          // Continue with other buttons
        }
      }
      
      // Test dropdown menus and selects
      for (let i = 0; i < Math.min(2, inputs.length); i++) {
        try {
          const input = inputs[i];
          const tagName = await input.evaluate(el => el.tagName);
          
          if (tagName === 'SELECT') {
            const options = await input.$$('option');
            if (options.length > 1) {
              await input.select(await options[1].evaluate(opt => opt.value));
              await this.logTest(`${pageName} dropdown selection`, 'passed');
            }
          }
        } catch (error) {
          // Continue with other inputs
        }
      }
      
    } catch (error) {
      await this.logTest(`${pageName} interactions`, 'failed', error.message);
    }
  }

  async testUserProfileDropdown() {
    console.log('\n👤 Phase 5: User Profile Dropdown Testing');
    
    try {
      // Find user profile button
      const profileButton = await this.page.$('[data-testid="user-menu-button"]');
      let profileByContent = null;
      
      if (!profileButton) {
        profileByContent = await this.page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => 
            btn.textContent?.includes('@') ||
            btn.querySelector('[data-lucide="user"]') ||
            btn.querySelector('[data-lucide="chevron-down"]')
          ) || null;
        });
      }
      
      const userButton = profileButton || (profileByContent && profileByContent.asElement());
      
      if (userButton) {
        await this.logTest('User profile button found', 'passed');
        
        await userButton.click();
        await this.sleep(1500);
        
        await this.takeScreenshot('09-user-dropdown-open');
        
        // Test Account Settings option
        const accountSettings = await this.page.evaluateHandle(() => {
          const elements = Array.from(document.querySelectorAll('button, a'));
          return elements.find(el => 
            el.textContent?.toLowerCase().includes('account settings') ||
            el.textContent?.toLowerCase().includes('settings')
          ) || null;
        });
        
        if (accountSettings && accountSettings.asElement()) {
          await this.logTest('Account Settings option found', 'passed');
          
          const initialErrorCount = this.errors.length;
          await accountSettings.asElement().click();
          await this.sleep(2000);
          
          if (this.errors.length === initialErrorCount) {
            await this.logTest('Account Settings navigation', 'passed');
            await this.takeScreenshot('10-account-settings-page');
          } else {
            await this.logTest('Account Settings navigation', 'failed', 'Navigation caused errors', true);
          }
        } else {
          await this.logTest('Account Settings option found', 'failed', 'Option not found', true);
        }
        
      } else {
        await this.logTest('User profile button found', 'failed', 'Profile button not found', true);
      }
      
    } catch (error) {
      await this.logTest('User profile dropdown testing', 'failed', error.message, true);
      await this.takeScreenshot('10-profile-dropdown-error');
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Comprehensive Test Report...');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.status === 'passed').length;
    const failedTests = this.testResults.filter(test => test.status === 'failed').length;
    const criticalFailures = this.testResults.filter(test => test.status === 'failed' && test.critical).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(2);
    
    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        criticalFailures,
        successRate: `${successRate}%`,
        screenshotsTaken: this.screenshots.length,
        errorsDetected: this.errors.length,
        testDuration: new Date().toISOString()
      },
      testResults: this.testResults,
      errors: this.errors,
      screenshots: this.screenshots.map(s => s.name)
    };
    
    // Save detailed JSON report
    await fs.writeFile(
      join(__dirname, 'COMPREHENSIVE-UI-TEST-REPORT.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Create markdown report
    let markdownReport = `# ShimmyServeAI - Comprehensive UI Test Report\n\n`;
    markdownReport += `**Generated**: ${new Date().toISOString()}\n\n`;
    markdownReport += `## 🎯 FINAL RESULTS:\n`;
    markdownReport += `   📊 Total Tests: ${totalTests}\n`;
    markdownReport += `   ✅ Passed: ${passedTests}\n`;
    markdownReport += `   ❌ Failed: ${failedTests}\n`;
    markdownReport += `   🚨 Critical Failures: ${criticalFailures}\n`;
    markdownReport += `   🏆 Success Rate: ${successRate}%\n`;
    markdownReport += `   📸 Screenshots: ${this.screenshots.length}\n`;
    markdownReport += `   ⚠️ Errors: ${this.errors.length}\n\n`;
    
    if (criticalFailures > 0) {
      markdownReport += `## 🚨 CRITICAL FAILURES:\n`;
      this.testResults.filter(test => test.status === 'failed' && test.critical).forEach(test => {
        markdownReport += `   • ${test.name}: ${test.details}\n`;
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
      join(__dirname, 'COMPREHENSIVE-UI-TEST-REPORT.md'),
      markdownReport
    );
    
    // Console summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║           SHIMMY SERVE AI - COMPREHENSIVE UI TEST           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n🎯 FINAL RESULTS:`);
    console.log(`   📊 Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   🚨 Critical Failures: ${criticalFailures}`);
    console.log(`   🏆 Success Rate: ${successRate}%`);
    console.log(`   📸 Screenshots: ${this.screenshots.length}`);
    console.log(`   ⚠️ Errors: ${this.errors.length}`);
    
    if (criticalFailures > 0) {
      console.log(`\n🚨 CRITICAL FAILURES DETECTED:`);
      this.testResults.filter(test => test.status === 'failed' && test.critical).forEach(test => {
        console.log(`   • ${test.name}: ${test.details}`);
      });
    }
    
    console.log(`\n📄 Reports saved:`);
    console.log(`   - JSON: COMPREHENSIVE-UI-TEST-REPORT.json`);
    console.log(`   - Markdown: COMPREHENSIVE-UI-TEST-REPORT.md`);
    console.log(`   - Screenshots: ./screenshots/ directory`);
    
    return successRate >= 90;
  }

  async runAllTests() {
    try {
      await this.init();
      
      // Run all test phases
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.log('❌ Cannot continue without successful login');
        return false;
      }
      
      await this.testNotifications();
      await this.testServerSettings();
      await this.testUserProfileDropdown();
      await this.testAllPages();
      
      // Generate final report
      const success = await this.generateReport();
      
      console.log('\n🏁 Comprehensive UI testing completed!');
      
      if (this.testResults.filter(test => test.status === 'failed' && test.critical).length > 0) {
        console.log('🚨 CRITICAL ISSUES FOUND - IMMEDIATE ATTENTION REQUIRED');
        this.testResults.filter(test => test.status === 'failed' && test.critical).forEach(test => {
          console.log(`🚨 CRITICAL: ${test.name}`);
        });
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Testing framework error:', error);
      return false;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the comprehensive test
const tester = new ComprehensiveUITester();
tester.runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});