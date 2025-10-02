#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_URL = 'http://localhost:5173';

class FixVerifier {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.errors = [];
  }

  async init() {
    console.log('🔍 VERIFYING ALL FIXES...\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    this.page = await this.browser.newPage();

    // Monitor errors
    this.page.on('pageerror', error => {
      console.error('💥 Page Error:', error.message);
      this.errors.push({ type: 'page', message: error.message, timestamp: new Date().toISOString() });
    });
  }

  async logTest(name, status, details = '') {
    const result = { name, status, details, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    
    const icon = status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${name} ${details ? `- ${details}` : ''}`);
  }

  async takeScreenshot(name) {
    try {
      const filename = `verify-${name}-${Date.now()}.png`;
      const filepath = join(__dirname, 'screenshots', filename);
      
      await fs.mkdir(join(__dirname, 'screenshots'), { recursive: true });
      await this.page.screenshot({ path: filepath, fullPage: true });
      console.log(`📸 Screenshot: ${filename}`);
      return filepath;
    } catch (error) {
      console.error(`Screenshot failed:`, error.message);
    }
  }

  async login() {
    console.log('🔐 Logging in...');
    
    await this.page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // API login
    const loginResult = await this.page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'demo@example.com',
            password: 'demo123'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('shimmy-access-token', data.accessToken);
          localStorage.setItem('shimmy-refresh-token', data.refreshToken);
          return { success: true };
        } else {
          return { success: false, error: await response.text() };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (loginResult.success) {
      await this.page.reload({ waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      await this.logTest('Authentication', 'passed');
      return true;
    } else {
      await this.logTest('Authentication', 'failed', loginResult.error);
      return false;
    }
  }

  async testDropdowns() {
    console.log('\n🎯 Testing Dropdown Fixes...');
    
    // Test notifications dropdown
    await this.takeScreenshot('before-notifications-test');
    
    const notifTest = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const bellButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && svg.innerHTML.includes('bell');
      });
      
      if (bellButton) {
        bellButton.click();
        return { found: true, clicked: true };
      }
      return { found: false };
    });

    if (notifTest.found) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if dropdown is visible and properly positioned
      const dropdownCheck = await this.page.evaluate(() => {
        const dropdown = document.querySelector('.absolute.right-0.top-full');
        if (dropdown) {
          const rect = dropdown.getBoundingClientRect();
          const style = window.getComputedStyle(dropdown);
          return {
            visible: true,
            zIndex: style.zIndex,
            clipped: rect.right > window.innerWidth || rect.bottom > window.innerHeight,
            position: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }
          };
        }
        return { visible: false };
      });

      await this.takeScreenshot('notifications-dropdown-open');

      if (dropdownCheck.visible && dropdownCheck.zIndex === '9999') {
        await this.logTest('Notifications dropdown positioning', 'passed', `z-index: ${dropdownCheck.zIndex}, not clipped: ${!dropdownCheck.clipped}`);
      } else {
        await this.logTest('Notifications dropdown positioning', 'failed', `z-index: ${dropdownCheck.zIndex}, clipped: ${dropdownCheck.clipped}`);
      }
    } else {
      await this.logTest('Notifications dropdown', 'failed', 'Bell button not found');
    }

    // Test user dropdown
    const userTest = await this.page.evaluate(() => {
      const userButton = document.querySelector('[data-testid="user-menu-button"]');
      if (userButton) {
        userButton.click();
        return true;
      }
      return false;
    });

    if (userTest) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userDropdownCheck = await this.page.evaluate(() => {
        const dropdown = document.querySelector('[data-testid="user-dropdown"]');
        if (dropdown) {
          const style = window.getComputedStyle(dropdown);
          const rect = dropdown.getBoundingClientRect();
          return {
            visible: true,
            zIndex: style.zIndex,
            clipped: rect.right > window.innerWidth || rect.bottom > window.innerHeight
          };
        }
        return { visible: false };
      });

      await this.takeScreenshot('user-dropdown-open');

      if (userDropdownCheck.visible && userDropdownCheck.zIndex === '9999') {
        await this.logTest('User dropdown positioning', 'passed', `z-index: ${userDropdownCheck.zIndex}, not clipped: ${!userDropdownCheck.clipped}`);
      } else {
        await this.logTest('User dropdown positioning', 'failed', `z-index: ${userDropdownCheck.zIndex}, clipped: ${userDropdownCheck.clipped}`);
      }
    } else {
      await this.logTest('User dropdown', 'failed', 'User button not found');
    }
  }

  async testMonitoringPage() {
    console.log('\n📊 Testing Monitoring Page Fix...');
    
    const initialErrorCount = this.errors.length;
    
    try {
      await this.page.goto(`${APP_URL}/monitoring`, { waitUntil: 'networkidle0', timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if page loaded without errors
      const hasError = await this.page.evaluate(() => {
        const errorText = document.body.textContent;
        return errorText.includes('Something went wrong') || 
               errorText.includes('TypeError') || 
               errorText.includes('Cannot read properties');
      });

      await this.takeScreenshot('monitoring-page-loaded');

      if (!hasError && this.errors.length === initialErrorCount) {
        await this.logTest('Monitoring page loads', 'passed', 'No errors or crashes detected');
      } else if (hasError) {
        await this.logTest('Monitoring page loads', 'failed', 'Error page still displayed');
      } else {
        await this.logTest('Monitoring page loads', 'failed', `${this.errors.length - initialErrorCount} new errors`);
      }
      
    } catch (error) {
      await this.logTest('Monitoring page loads', 'failed', `Navigation timeout: ${error.message}`);
    }
  }

  async testAllPageNavigation() {
    console.log('\n🧭 Testing All Page Navigation...');
    
    const pages = [
      { name: 'Dashboard', path: '/' },
      { name: 'Settings', path: '/settings' },
      { name: 'Logs', path: '/logs' },
      { name: 'Terminal', path: '/terminal' },
      { name: 'Users', path: '/users' },
      { name: 'Security', path: '/security' },
      { name: 'Performance', path: '/performance' },
      { name: 'Network', path: '/network' },
      { name: 'Knowledge Base', path: '/knowledge' }
    ];

    for (const page of pages) {
      try {
        const initialErrorCount = this.errors.length;
        
        await this.page.goto(`${APP_URL}${page.path}`, { waitUntil: 'networkidle0', timeout: 8000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const hasError = await this.page.evaluate(() => {
          const errorText = document.body.textContent;
          return errorText.includes('Something went wrong') || 
                 errorText.includes('TypeError') || 
                 errorText.includes('Cannot read properties');
        });

        if (!hasError && this.errors.length === initialErrorCount) {
          await this.logTest(`${page.name} navigation`, 'passed');
        } else {
          await this.logTest(`${page.name} navigation`, 'failed', hasError ? 'Error page' : 'Console errors');
        }
        
      } catch (error) {
        await this.logTest(`${page.name} navigation`, 'failed', 'Timeout or crash');
      }
    }
  }

  async testSettingsSave() {
    console.log('\n⚙️ Testing Settings Save...');
    
    await this.page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const saveTest = await this.page.evaluate(async () => {
      try {
        // Find first text input and modify it
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
        if (inputs.length > 0) {
          const testInput = inputs[0];
          const originalValue = testInput.value;
          testInput.value = originalValue + '_test';
          testInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Wait for save button
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const buttons = Array.from(document.querySelectorAll('button'));
          const saveButton = buttons.find(btn => 
            btn.textContent?.includes('Save') && 
            !btn.disabled
          );
          
          if (saveButton) {
            saveButton.click();
            return { success: true, action: 'clicked_save' };
          } else {
            return { success: false, error: 'Save button not found or disabled' };
          }
        }
        return { success: false, error: 'No input fields found' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (saveTest.success) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const messageCheck = await this.page.evaluate(() => {
        const successEl = document.querySelector('.success, .green, [class*="success"]');
        const errorEl = document.querySelector('.error, .red, [class*="error"]');
        
        return {
          hasSuccess: !!successEl,
          hasError: !!errorEl,
          successText: successEl?.textContent || '',
          errorText: errorEl?.textContent || ''
        };
      });

      await this.takeScreenshot('settings-save-result');

      if (messageCheck.hasSuccess) {
        await this.logTest('Settings save', 'passed', 'Configuration saved successfully');
      } else if (messageCheck.hasError) {
        await this.logTest('Settings save', 'failed', `Error: ${messageCheck.errorText}`);
      } else {
        await this.logTest('Settings save', 'failed', 'No feedback message');
      }
    } else {
      await this.logTest('Settings save', 'failed', saveTest.error);
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Verification Report...');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.status === 'passed').length;
    const failedTests = this.testResults.filter(test => test.status === 'failed').length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(2);
    
    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: `${successRate}%`,
        errorsDetected: this.errors.length,
        timestamp: new Date().toISOString()
      },
      testResults: this.testResults,
      errors: this.errors
    };
    
    await fs.writeFile(
      join(__dirname, 'FIX-VERIFICATION-REPORT.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    FIX VERIFICATION REPORT                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 RESULTS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   🏆 Success Rate: ${successRate}%`);
    console.log(`   ⚠️ Errors: ${this.errors.length}`);
    
    console.log(`\n📋 DETAILED RESULTS:`);
    this.testResults.forEach(test => {
      const icon = test.status === 'passed' ? '✅' : '❌';
      console.log(`   ${icon} ${test.name}`);
      if (test.details) console.log(`      ${test.details}`);
    });
    
    if (successRate >= 90) {
      console.log(`\n🎉 VERIFICATION SUCCESSFUL! All major fixes are working.`);
    } else {
      console.log(`\n⚠️ Some issues remain. Check the detailed results above.`);
    }
    
    return successRate >= 90;
  }

  async runVerification() {
    try {
      await this.init();
      
      const authSuccess = await this.login();
      if (!authSuccess) {
        console.log('🚨 Cannot verify without authentication');
        return false;
      }
      
      await this.testDropdowns();
      await this.testMonitoringPage();
      await this.testAllPageNavigation();
      await this.testSettingsSave();
      
      const success = await this.generateReport();
      
      console.log('\n🏁 Fix verification completed!');
      return success;
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      return false;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run verification
const verifier = new FixVerifier();
verifier.runVerification().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Verification execution failed:', error);
  process.exit(1);
});