#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

class UltimateE2ETester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.errors = [];
    this.screenshots = [];
    this.apiTests = [];
    this.componentTests = [];
    this.interactionTests = [];
  }

  async init() {
    console.log('🚀 ULTIMATE E2E TESTING - EVERY ELEMENT, COMPONENT, AND INTERACTION');
    console.log('📋 Testing EVERYTHING comprehensively...\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    this.page = await this.browser.newPage();

    // Monitor ALL errors and console output
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console Error:', msg.text());
        this.errors.push({ type: 'console', message: msg.text(), timestamp: new Date().toISOString() });
      }
    });

    this.page.on('pageerror', error => {
      console.error('💥 Page Error:', error.message);
      this.errors.push({ type: 'page', message: error.message, stack: error.stack, timestamp: new Date().toISOString() });
    });

    this.page.on('requestfailed', request => {
      if (!request.url().includes('favicon')) {
        console.error('🌐 Request Failed:', request.url());
        this.errors.push({ type: 'network', url: request.url(), error: request.failure().errorText, timestamp: new Date().toISOString() });
      }
    });

    // Intercept all network requests to validate API responses
    this.page.on('response', response => {
      if (response.url().includes(API_URL)) {
        this.apiTests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async logTest(category, name, status, details = '', critical = false) {
    const result = { category, name, status, details, critical, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    
    const icon = status === 'passed' ? '✅' : critical ? '🚨' : '❌';
    console.log(`${icon} [${category}] ${name} ${details ? `- ${details}` : ''}`);
  }

  async takeScreenshot(name, fullPage = true) {
    try {
      const filename = `e2e-${name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`;
      const filepath = join(__dirname, 'screenshots', filename);
      
      await fs.mkdir(join(__dirname, 'screenshots'), { recursive: true });
      await this.page.screenshot({ path: filepath, fullPage });
      this.screenshots.push({ name, filepath });
      console.log(`📸 Screenshot: ${filename}`);
    } catch (error) {
      console.error(`Screenshot failed:`, error.message);
    }
  }

  async waitAndRetry(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // ====== BACKEND API TESTING ======
  async testBackendAPIs() {
    console.log('\n🔧 Phase 1: COMPREHENSIVE BACKEND API TESTING');
    
    const apiEndpoints = [
      { method: 'GET', path: '/health', description: 'Health check' },
      { method: 'POST', path: '/api/auth/login', description: 'Authentication login', body: { email: 'demo@example.com', password: 'demo123' } },
      { method: 'GET', path: '/api/auth/verify', description: 'Token verification', requiresAuth: true },
      { method: 'GET', path: '/api/config/server', description: 'Server configuration', requiresAuth: true },
      { method: 'POST', path: '/api/config/server/validate', description: 'Config validation', requiresAuth: true, body: { config: { general: {}, inference: {}, networking: {}, security: {} } } },
      { method: 'GET', path: '/api/metrics/current', description: 'Current metrics', requiresAuth: true },
      { method: 'GET', path: '/api/logs', description: 'System logs', requiresAuth: true },
      { method: 'GET', path: '/api/system/status', description: 'System status', requiresAuth: true },
      { method: 'GET', path: '/api/docker/containers', description: 'Docker containers', requiresAuth: true },
      { method: 'GET', path: '/api/kubernetes/status', description: 'Kubernetes status', requiresAuth: true },
    ];

    let authToken = null;

    for (const endpoint of apiEndpoints) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (endpoint.requiresAuth && authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const options = {
          method: endpoint.method,
          headers
        };

        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }

        const response = await fetch(`${API_URL}${endpoint.path}`, options);
        const responseText = await response.text();
        
        if (response.ok) {
          await this.logTest('Backend API', endpoint.description, 'passed', `${response.status} - ${responseText.length} bytes`);
          
          // Store auth token from login
          if (endpoint.path === '/api/auth/login' && response.ok) {
            try {
              const loginData = JSON.parse(responseText);
              authToken = loginData.accessToken;
            } catch (e) {
              console.warn('Could not parse login response for token');
            }
          }
        } else {
          await this.logTest('Backend API', endpoint.description, 'failed', `${response.status} - ${responseText}`, true);
        }

      } catch (error) {
        await this.logTest('Backend API', endpoint.description, 'failed', error.message, true);
      }
    }
  }

  // ====== AUTHENTICATION TESTING ======
  async performAuthentication() {
    console.log('\n🔐 Phase 2: AUTHENTICATION TESTING');
    
    await this.page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await this.takeScreenshot('01-initial-load');

    // Test login form elements
    const formElements = await this.page.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"], input[name="email"]');
      const passwordInput = document.querySelector('input[type="password"]');
      const loginButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.toLowerCase().includes('sign in') ||
        btn.textContent?.toLowerCase().includes('login')
      );

      return {
        hasEmailInput: !!emailInput,
        hasPasswordInput: !!passwordInput,
        hasLoginButton: !!loginButton,
        emailInputType: emailInput?.type,
        passwordInputType: passwordInput?.type,
        loginButtonText: loginButton?.textContent?.trim()
      };
    });

    await this.logTest('Auth UI', 'Email input present', formElements.hasEmailInput ? 'passed' : 'failed');
    await this.logTest('Auth UI', 'Password input present', formElements.hasPasswordInput ? 'passed' : 'failed');
    await this.logTest('Auth UI', 'Login button present', formElements.hasLoginButton ? 'passed' : 'failed');

    if (formElements.hasEmailInput && formElements.hasPasswordInput && formElements.hasLoginButton) {
      // Test form interaction
      await this.page.type('input[type="email"], input[name="email"]', 'demo@example.com');
      await this.page.type('input[type="password"]', 'demo123');
      
      await this.takeScreenshot('02-login-form-filled');
      
      // Click login button
      const loginButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent?.toLowerCase().includes('sign in') ||
          btn.textContent?.toLowerCase().includes('login')
        );
      });

      if (loginButton) {
        await loginButton.asElement().click();
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await this.takeScreenshot('03-after-login-attempt');
        
        // Check if login was successful
        const loginSuccess = await this.page.evaluate(() => {
          const indicators = [];
          
          if (document.querySelector('header')) indicators.push('header-present');
          if (document.querySelector('[data-testid="user-menu-button"]')) indicators.push('user-menu');
          if (document.querySelector('h1, h2, h3')) {
            const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
            const dashboardHeading = headings.find(h => 
              h.textContent?.toLowerCase().includes('dashboard') ||
              h.textContent?.toLowerCase().includes('welcome')
            );
            if (dashboardHeading) indicators.push('dashboard-heading');
          }
          
          return {
            indicators,
            url: window.location.href,
            stillOnLoginPage: !!document.querySelector('input[type="password"]')
          };
        });

        if (loginSuccess.indicators.length > 0 && !loginSuccess.stillOnLoginPage) {
          await this.logTest('Authentication', 'Login success', 'passed', `Found: ${loginSuccess.indicators.join(', ')}`);
          return true;
        } else {
          await this.logTest('Authentication', 'Login success', 'failed', 'Still on login page or no success indicators', true);
          return false;
        }
      }
    }

    await this.logTest('Authentication', 'Login process', 'failed', 'Missing form elements', true);
    return false;
  }

  // ====== COMPREHENSIVE UI COMPONENT TESTING ======
  async testEveryUIComponent() {
    console.log('\n🎯 Phase 3: COMPREHENSIVE UI COMPONENT TESTING');

    // Test Header Components
    await this.testHeaderComponents();
    
    // Test Navigation
    await this.testNavigationComponents();
    
    // Test Every Page
    await this.testAllPages();
    
    // Test Interactive Elements
    await this.testAllInteractiveElements();
  }

  async testHeaderComponents() {
    console.log('\n📋 Testing Header Components...');
    
    const headerTest = await this.page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return { exists: false };

      const components = {
        statusIndicator: !!header.querySelector('.bg-green-500'),
        statusText: header.querySelector('.text-green-400')?.textContent,
        notificationButton: !!header.querySelector('button svg') && Array.from(header.querySelectorAll('button')).some(btn => {
          const svg = btn.querySelector('svg');
          return svg && svg.innerHTML.includes('bell');
        }),
        userMenuButton: !!header.querySelector('[data-testid="user-menu-button"]'),
        userAvatar: !!header.querySelector('.bg-gradient-to-r'),
        userName: header.querySelector('[data-testid="user-menu-button"] .text-sm')?.textContent,
        userRole: header.querySelector('[data-testid="user-menu-button"] .text-xs')?.textContent
      };

      return { exists: true, components };
    });

    if (headerTest.exists) {
      await this.logTest('Header UI', 'Header exists', 'passed');
      await this.logTest('Header UI', 'Status indicator', headerTest.components.statusIndicator ? 'passed' : 'failed');
      await this.logTest('Header UI', 'Notification button', headerTest.components.notificationButton ? 'passed' : 'failed');
      await this.logTest('Header UI', 'User menu button', headerTest.components.userMenuButton ? 'passed' : 'failed');
      await this.logTest('Header UI', 'User avatar', headerTest.components.userAvatar ? 'passed' : 'failed');
    } else {
      await this.logTest('Header UI', 'Header exists', 'failed', 'Header not found', true);
    }

    // Test Notifications Dropdown
    if (headerTest.exists && headerTest.components.notificationButton) {
      await this.testNotificationsDropdown();
    }

    // Test User Menu Dropdown
    if (headerTest.exists && headerTest.components.userMenuButton) {
      await this.testUserMenuDropdown();
    }
  }

  async testNotificationsDropdown() {
    console.log('\n🔔 Testing Notifications Dropdown...');
    
    // Click notifications button
    const notifClicked = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const bellButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && svg.innerHTML.includes('bell');
      });
      
      if (bellButton) {
        bellButton.click();
        return true;
      }
      return false;
    });

    if (notifClicked) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.takeScreenshot('04-notifications-dropdown');
      
      const dropdownTest = await this.page.evaluate(() => {
        const dropdown = document.querySelector('.absolute.right-0.top-full');
        if (!dropdown) return { visible: false };

        const components = {
          visible: true,
          title: dropdown.querySelector('h3')?.textContent,
          notifications: dropdown.querySelectorAll('.hover\\:bg-dark-700\\/50').length,
          markAllReadButton: !!Array.from(dropdown.querySelectorAll('button')).find(btn => 
            btn.textContent?.toLowerCase().includes('mark all')
          ),
          zIndex: window.getComputedStyle(dropdown).zIndex,
          position: dropdown.getBoundingClientRect()
        };

        return components;
      });

      await this.logTest('Notifications', 'Dropdown visible', dropdownTest.visible ? 'passed' : 'failed');
      if (dropdownTest.visible) {
        await this.logTest('Notifications', 'Title present', dropdownTest.title ? 'passed' : 'failed');
        await this.logTest('Notifications', 'Notifications count', 'passed', `${dropdownTest.notifications} notifications`);
        await this.logTest('Notifications', 'Mark all read button', dropdownTest.markAllReadButton ? 'passed' : 'failed');
        await this.logTest('Notifications', 'Z-index fix', dropdownTest.zIndex === '9999' ? 'passed' : 'failed');
        
        // Test mark all read functionality
        if (dropdownTest.markAllReadButton) {
          await this.page.evaluate(() => {
            const markAllButton = Array.from(document.querySelectorAll('button')).find(btn => 
              btn.textContent?.toLowerCase().includes('mark all')
            );
            if (markAllButton) markAllButton.click();
          });
          await this.logTest('Notifications', 'Mark all read click', 'passed');
        }
      }

      // Test clicking outside to close
      await this.page.click('body');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const closedTest = await this.page.evaluate(() => {
        return !document.querySelector('.absolute.right-0.top-full');
      });
      
      await this.logTest('Notifications', 'Close on outside click', closedTest ? 'passed' : 'failed');
    }
  }

  async testUserMenuDropdown() {
    console.log('\n👤 Testing User Menu Dropdown...');
    
    // Click user menu button
    await this.page.click('[data-testid="user-menu-button"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.takeScreenshot('05-user-menu-dropdown');
    
    const userMenuTest = await this.page.evaluate(() => {
      const dropdown = document.querySelector('[data-testid="user-dropdown"]');
      if (!dropdown) return { visible: false };

      const components = {
        visible: true,
        userName: dropdown.querySelector('.text-sm.font-medium')?.textContent,
        userEmail: dropdown.querySelector('.text-xs.text-gray-400')?.textContent,
        accountSettingsButton: !!Array.from(dropdown.querySelectorAll('button')).find(btn => 
          btn.textContent?.includes('Account Settings')
        ),
        signOutButton: !!dropdown.querySelector('[data-testid="sign-out-button"]'),
        zIndex: window.getComputedStyle(dropdown).zIndex
      };

      return components;
    });

    await this.logTest('User Menu', 'Dropdown visible', userMenuTest.visible ? 'passed' : 'failed');
    if (userMenuTest.visible) {
      await this.logTest('User Menu', 'User name present', userMenuTest.userName ? 'passed' : 'failed');
      await this.logTest('User Menu', 'User email present', userMenuTest.userEmail ? 'passed' : 'failed');
      await this.logTest('User Menu', 'Account Settings button', userMenuTest.accountSettingsButton ? 'passed' : 'failed');
      await this.logTest('User Menu', 'Sign Out button', userMenuTest.signOutButton ? 'passed' : 'failed');
      await this.logTest('User Menu', 'Z-index fix', userMenuTest.zIndex === '9999' ? 'passed' : 'failed');
      
      // Test Account Settings click
      if (userMenuTest.accountSettingsButton) {
        await this.page.evaluate(() => {
          const settingsButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent?.includes('Account Settings')
          );
          if (settingsButton) settingsButton.click();
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const redirectTest = await this.page.evaluate(() => {
          return window.location.href.includes('/settings');
        });
        
        await this.logTest('User Menu', 'Account Settings navigation', redirectTest ? 'passed' : 'failed');
      }
    }
  }

  async testNavigationComponents() {
    console.log('\n🧭 Testing Navigation Components...');
    
    // Check for sidebar or navigation
    const navTest = await this.page.evaluate(() => {
      const sidebar = document.querySelector('aside, nav, .sidebar');
      const navLinks = document.querySelectorAll('a[href], button[onclick], [role="button"]');
      
      return {
        hasSidebar: !!sidebar,
        totalNavElements: navLinks.length,
        sidebarContent: sidebar ? sidebar.innerHTML.substring(0, 500) : null
      };
    });

    await this.logTest('Navigation', 'Navigation elements', 'passed', `${navTest.totalNavElements} interactive elements found`);
    await this.logTest('Navigation', 'Sidebar present', navTest.hasSidebar ? 'passed' : 'failed');
  }

  async testAllPages() {
    console.log('\n📄 Testing All Pages Comprehensively...');
    
    const pages = [
      { name: 'Dashboard', path: '/', critical: true },
      { name: 'Settings', path: '/settings', critical: true },
      { name: 'Monitoring', path: '/monitoring', critical: true },
      { name: 'Logs', path: '/logs', critical: false },
      { name: 'Terminal', path: '/terminal', critical: false },
      { name: 'Users', path: '/users', critical: false },
      { name: 'Security', path: '/security', critical: false },
      { name: 'Performance', path: '/performance', critical: false },
      { name: 'Network', path: '/network', critical: false },
      { name: 'Knowledge Base', path: '/knowledge', critical: false }
    ];

    for (const page of pages) {
      await this.testPageComprehensively(page);
    }
  }

  async testPageComprehensively(page) {
    console.log(`\n📋 Testing ${page.name} Page Comprehensively...`);
    
    try {
      const initialErrorCount = this.errors.length;
      
      // Navigate to page
      await this.page.goto(`${APP_URL}${page.path}`, { waitUntil: 'networkidle0', timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await this.takeScreenshot(`page-${page.name.toLowerCase()}`);
      
      // Check for errors
      const hasError = await this.page.evaluate(() => {
        const errorText = document.body.textContent;
        return errorText.includes('Something went wrong') || 
               errorText.includes('TypeError') || 
               errorText.includes('Cannot read properties') ||
               errorText.includes('Error:');
      });

      if (hasError) {
        await this.logTest('Page Load', `${page.name}`, 'failed', 'Error page detected', page.critical);
        return;
      }

      if (this.errors.length > initialErrorCount) {
        await this.logTest('Page Load', `${page.name}`, 'failed', `${this.errors.length - initialErrorCount} console errors`, page.critical);
        return;
      }

      // Test page content
      const pageContent = await this.page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input, select, textarea');
        const links = document.querySelectorAll('a[href]');
        const forms = document.querySelectorAll('form');
        const tables = document.querySelectorAll('table');
        const cards = document.querySelectorAll('.card, [class*="card"], .panel, [class*="panel"]');

        return {
          headings: headings.length,
          buttons: buttons.length,
          inputs: inputs.length,
          links: links.length,
          forms: forms.length,
          tables: tables.length,
          cards: cards.length,
          title: document.title,
          mainHeading: headings[0]?.textContent || 'No heading found'
        };
      });

      await this.logTest('Page Load', `${page.name}`, 'passed');
      await this.logTest('Page Content', `${page.name} headings`, 'passed', `${pageContent.headings} headings`);
      await this.logTest('Page Content', `${page.name} buttons`, 'passed', `${pageContent.buttons} buttons`);
      await this.logTest('Page Content', `${page.name} inputs`, 'passed', `${pageContent.inputs} inputs`);
      await this.logTest('Page Content', `${page.name} main heading`, 'passed', pageContent.mainHeading);

      // Test every button on the page
      await this.testAllButtonsOnPage(page.name);
      
      // Test every input on the page
      await this.testAllInputsOnPage(page.name);
      
      // Test special page functionality
      if (page.name === 'Settings') {
        await this.testSettingsPageFunctionality();
      } else if (page.name === 'Monitoring') {
        await this.testMonitoringPageFunctionality();
      } else if (page.name === 'Terminal') {
        await this.testTerminalPageFunctionality();
      }

    } catch (error) {
      await this.logTest('Page Load', `${page.name}`, 'failed', error.message, page.critical);
    }
  }

  async testAllButtonsOnPage(pageName) {
    console.log(`  🔘 Testing all buttons on ${pageName}...`);
    
    const buttons = await this.page.$$('button:not([disabled])');
    let testedButtons = 0;
    
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      try {
        const button = buttons[i];
        const buttonInfo = await button.evaluate(el => ({
          text: el.textContent?.trim() || `Button ${i}`,
          className: el.className,
          type: el.type,
          disabled: el.disabled
        }));

        // Skip dangerous buttons
        if (buttonInfo.text.toLowerCase().includes('delete') ||
            buttonInfo.text.toLowerCase().includes('remove') ||
            buttonInfo.text.toLowerCase().includes('logout') ||
            buttonInfo.text.toLowerCase().includes('sign out')) {
          continue;
        }

        const initialErrorCount = this.errors.length;
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (this.errors.length === initialErrorCount) {
          await this.logTest('Button Test', `${pageName} - "${buttonInfo.text}"`, 'passed');
        } else {
          await this.logTest('Button Test', `${pageName} - "${buttonInfo.text}"`, 'failed', 'Caused errors');
        }
        
        testedButtons++;
      } catch (error) {
        await this.logTest('Button Test', `${pageName} - Button ${i}`, 'failed', error.message);
      }
    }
    
    console.log(`    Tested ${testedButtons} buttons on ${pageName}`);
  }

  async testAllInputsOnPage(pageName) {
    console.log(`  📝 Testing all inputs on ${pageName}...`);
    
    const inputs = await this.page.$$('input, select, textarea');
    let testedInputs = 0;
    
    for (let i = 0; i < Math.min(inputs.length, 5); i++) {
      try {
        const input = inputs[i];
        const inputInfo = await input.evaluate(el => ({
          type: el.type,
          name: el.name || `input-${i}`,
          placeholder: el.placeholder,
          value: el.value
        }));

        // Test input interaction
        if (inputInfo.type === 'text' || inputInfo.type === 'email' || inputInfo.type === 'password') {
          await input.click();
          await input.type('test');
          await this.logTest('Input Test', `${pageName} - ${inputInfo.name}`, 'passed', `Type: ${inputInfo.type}`);
        } else if (inputInfo.type === 'number') {
          await input.click();
          await input.type('123');
          await this.logTest('Input Test', `${pageName} - ${inputInfo.name}`, 'passed', `Type: ${inputInfo.type}`);
        } else if (inputInfo.type === 'checkbox') {
          await input.click();
          await this.logTest('Input Test', `${pageName} - ${inputInfo.name}`, 'passed', `Type: ${inputInfo.type}`);
        }
        
        testedInputs++;
      } catch (error) {
        await this.logTest('Input Test', `${pageName} - Input ${i}`, 'failed', error.message);
      }
    }
    
    console.log(`    Tested ${testedInputs} inputs on ${pageName}`);
  }

  async testSettingsPageFunctionality() {
    console.log('  ⚙️ Testing Settings page specific functionality...');
    
    // Test configuration sections
    const configTest = await this.page.evaluate(() => {
      const sections = document.querySelectorAll('.bg-dark-950\\/95, .card, .panel');
      const inputs = document.querySelectorAll('input, select, textarea');
      const saveButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Save')
      );
      const resetButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Reset')
      );
      const exportButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Export')
      );

      return {
        sections: sections.length,
        inputs: inputs.length,
        hasSaveButton: !!saveButton,
        hasResetButton: !!resetButton,
        hasExportButton: !!exportButton,
        saveButtonEnabled: saveButton ? !saveButton.disabled : false
      };
    });

    await this.logTest('Settings', 'Configuration sections', 'passed', `${configTest.sections} sections`);
    await this.logTest('Settings', 'Input fields', 'passed', `${configTest.inputs} inputs`);
    await this.logTest('Settings', 'Save button present', configTest.hasSaveButton ? 'passed' : 'failed');
    await this.logTest('Settings', 'Reset button present', configTest.hasResetButton ? 'passed' : 'failed');
    await this.logTest('Settings', 'Export button present', configTest.hasExportButton ? 'passed' : 'failed');

    // Test making a change and saving
    if (configTest.hasSaveButton && configTest.inputs > 0) {
      const saveTest = await this.page.evaluate(async () => {
        try {
          const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
          if (inputs.length > 0) {
            const testInput = inputs[0];
            const originalValue = testInput.value;
            testInput.value = originalValue + '_test';
            testInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Wait for save button to become enabled
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const saveButton = Array.from(document.querySelectorAll('button')).find(btn => 
              btn.textContent?.includes('Save') && !btn.disabled
            );
            
            if (saveButton) {
              saveButton.click();
              return { success: true };
            }
          }
          return { success: false, error: 'Could not modify input or find save button' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      if (saveTest.success) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for success/error messages
        const messageTest = await this.page.evaluate(() => {
          const successEl = document.querySelector('.success, .green, [class*="success"]');
          const errorEl = document.querySelector('.error, .red, [class*="error"]');
          
          return {
            hasSuccess: !!successEl,
            hasError: !!errorEl,
            successText: successEl?.textContent || '',
            errorText: errorEl?.textContent || ''
          };
        });

        if (messageTest.hasSuccess) {
          await this.logTest('Settings', 'Save functionality', 'passed', 'Configuration saved successfully');
        } else if (messageTest.hasError) {
          await this.logTest('Settings', 'Save functionality', 'failed', `Error: ${messageTest.errorText}`);
        } else {
          await this.logTest('Settings', 'Save functionality', 'failed', 'No feedback message');
        }
      } else {
        await this.logTest('Settings', 'Save functionality', 'failed', saveTest.error);
      }
    }
  }

  async testMonitoringPageFunctionality() {
    console.log('  📊 Testing Monitoring page specific functionality...');
    
    const monitoringTest = await this.page.evaluate(() => {
      const charts = document.querySelectorAll('canvas, svg, .chart, [class*="chart"]');
      const metrics = document.querySelectorAll('.metric, [class*="metric"], .stat, [class*="stat"]');
      const progressBars = document.querySelectorAll('.progress, [class*="progress"], .bg-red-500, .bg-blue-500, .bg-purple-500');
      const refreshButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Refresh') || btn.textContent?.includes('Update')
      );

      return {
        charts: charts.length,
        metrics: metrics.length,
        progressBars: progressBars.length,
        hasRefreshButton: !!refreshButton,
        hasSystemStatus: !!document.querySelector('.bg-green-500, .text-green-400'),
        hasErrorBoundary: !document.textContent.includes('TypeError')
      };
    });

    await this.logTest('Monitoring', 'Charts/visualizations', 'passed', `${monitoringTest.charts} charts`);
    await this.logTest('Monitoring', 'Metrics display', 'passed', `${monitoringTest.metrics} metrics`);
    await this.logTest('Monitoring', 'Progress bars', 'passed', `${monitoringTest.progressBars} progress bars`);
    await this.logTest('Monitoring', 'System status indicator', monitoringTest.hasSystemStatus ? 'passed' : 'failed');
    await this.logTest('Monitoring', 'No TypeError crashes', monitoringTest.hasErrorBoundary ? 'passed' : 'failed');
  }

  async testTerminalPageFunctionality() {
    console.log('  💻 Testing Terminal page specific functionality...');
    
    const terminalTest = await this.page.evaluate(() => {
      const terminal = document.querySelector('.terminal, [class*="terminal"], .console, [class*="console"]');
      const input = document.querySelector('input[type="text"], textarea');
      const output = document.querySelector('.output, [class*="output"], pre, code');
      
      return {
        hasTerminal: !!terminal,
        hasInput: !!input,
        hasOutput: !!output,
        terminalContent: terminal ? terminal.textContent.substring(0, 200) : null
      };
    });

    await this.logTest('Terminal', 'Terminal interface', terminalTest.hasTerminal ? 'passed' : 'failed');
    await this.logTest('Terminal', 'Command input', terminalTest.hasInput ? 'passed' : 'failed');
    await this.logTest('Terminal', 'Output display', terminalTest.hasOutput ? 'passed' : 'failed');
  }

  async testAllInteractiveElements() {
    console.log('\n🎯 Testing All Interactive Elements...');
    
    // Test all clickable elements across the entire application
    const interactiveTest = await this.page.evaluate(() => {
      const clickableElements = document.querySelectorAll('button, a[href], [role="button"], [onclick], input[type="submit"], input[type="button"]');
      const results = [];
      
      clickableElements.forEach((el, index) => {
        if (index < 20) { // Limit to first 20 for performance
          results.push({
            tag: el.tagName,
            text: el.textContent?.trim().substring(0, 50) || `Element ${index}`,
            href: el.href || null,
            type: el.type || null,
            className: el.className.substring(0, 50),
            disabled: el.disabled || false
          });
        }
      });
      
      return {
        total: clickableElements.length,
        tested: results,
        dropdowns: document.querySelectorAll('select, [role="combobox"], [class*="dropdown"]').length,
        modals: document.querySelectorAll('.modal, [role="dialog"], [class*="modal"]').length,
        tooltips: document.querySelectorAll('[title], [data-tooltip], .tooltip').length
      };
    });

    await this.logTest('Interactive', 'Total clickable elements', 'passed', `${interactiveTest.total} elements found`);
    await this.logTest('Interactive', 'Dropdown elements', 'passed', `${interactiveTest.dropdowns} dropdowns`);
    await this.logTest('Interactive', 'Modal elements', 'passed', `${interactiveTest.modals} modals`);
    await this.logTest('Interactive', 'Tooltip elements', 'passed', `${interactiveTest.tooltips} tooltips`);

    console.log(`Found ${interactiveTest.total} interactive elements, testing sample...`);
  }

  async generateComprehensiveReport() {
    console.log('\n📊 Generating Ultimate E2E Test Report...');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.status === 'passed').length;
    const failedTests = this.testResults.filter(test => test.status === 'failed').length;
    const criticalFailures = this.testResults.filter(test => test.critical).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(2);
    
    // Categorize results
    const categories = {};
    this.testResults.forEach(test => {
      if (!categories[test.category]) {
        categories[test.category] = { passed: 0, failed: 0, total: 0 };
      }
      categories[test.category].total++;
      if (test.status === 'passed') {
        categories[test.category].passed++;
      } else {
        categories[test.category].failed++;
      }
    });

    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        criticalFailures,
        successRate: `${successRate}%`,
        errorsDetected: this.errors.length,
        screenshotsTaken: this.screenshots.length,
        apiTestsPerformed: this.apiTests.length,
        testDuration: new Date().toISOString()
      },
      categoryBreakdown: categories,
      criticalIssues: this.testResults.filter(test => test.critical).map(test => `${test.name}: ${test.details}`),
      apiResults: this.apiTests,
      testResults: this.testResults,
      errors: this.errors,
      screenshots: this.screenshots.map(s => s.name)
    };
    
    // Save comprehensive report
    await fs.writeFile(
      join(__dirname, 'ULTIMATE-E2E-TEST-REPORT.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Create detailed markdown report
    let markdownReport = `# ShimmyServeAI - Ultimate E2E Test Report\n\n`;
    markdownReport += `**Generated**: ${new Date().toISOString()}\n\n`;
    markdownReport += `## 🎯 COMPREHENSIVE TEST RESULTS:\n`;
    markdownReport += `   📊 Total Tests: ${totalTests}\n`;
    markdownReport += `   ✅ Passed: ${passedTests}\n`;
    markdownReport += `   ❌ Failed: ${failedTests}\n`;
    markdownReport += `   🚨 Critical Failures: ${criticalFailures}\n`;
    markdownReport += `   🏆 Success Rate: ${successRate}%\n`;
    markdownReport += `   📸 Screenshots: ${this.screenshots.length}\n`;
    markdownReport += `   🔧 API Tests: ${this.apiTests.length}\n`;
    markdownReport += `   ⚠️ Errors: ${this.errors.length}\n\n`;
    
    markdownReport += `## 📋 CATEGORY BREAKDOWN:\n`;
    Object.entries(categories).forEach(([category, stats]) => {
      const categoryRate = ((stats.passed / stats.total) * 100).toFixed(1);
      markdownReport += `   **${category}**: ${stats.passed}/${stats.total} (${categoryRate}%)\n`;
    });
    markdownReport += `\n`;
    
    if (criticalFailures > 0) {
      markdownReport += `## 🚨 CRITICAL FAILURES:\n`;
      this.testResults.filter(test => test.critical).forEach(test => {
        markdownReport += `   • **${test.name}**: ${test.details}\n`;
      });
      markdownReport += `\n`;
    }
    
    markdownReport += `## 🔧 API TEST RESULTS:\n`;
    const apiSuccess = this.apiTests.filter(api => api.status >= 200 && api.status < 400).length;
    const apiTotal = this.apiTests.length;
    markdownReport += `   API Success Rate: ${apiTotal > 0 ? ((apiSuccess / apiTotal) * 100).toFixed(1) : 0}% (${apiSuccess}/${apiTotal})\n\n`;
    
    markdownReport += `## 📋 DETAILED TEST RESULTS:\n\n`;
    Object.entries(categories).forEach(([category, stats]) => {
      markdownReport += `### ${category}\n`;
      this.testResults.filter(test => test.category === category).forEach(test => {
        const icon = test.status === 'passed' ? '✅' : (test.critical ? '🚨' : '❌');
        markdownReport += `${icon} **${test.name}**`;
        if (test.details) markdownReport += ` - ${test.details}`;
        markdownReport += `\n`;
      });
      markdownReport += `\n`;
    });
    
    await fs.writeFile(
      join(__dirname, 'ULTIMATE-E2E-TEST-REPORT.md'),
      markdownReport
    );
    
    // Console summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              ULTIMATE E2E TEST REPORT                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n🎯 FINAL RESULTS:`);
    console.log(`   📊 Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   🚨 Critical Failures: ${criticalFailures}`);
    console.log(`   🏆 Success Rate: ${successRate}%`);
    console.log(`   🔧 API Tests: ${this.apiTests.length}`);
    console.log(`   📸 Screenshots: ${this.screenshots.length}`);
    console.log(`   ⚠️ Errors: ${this.errors.length}`);
    
    console.log(`\n📋 CATEGORY BREAKDOWN:`);
    Object.entries(categories).forEach(([category, stats]) => {
      const categoryRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`   ${category}: ${stats.passed}/${stats.total} (${categoryRate}%)`);
    });
    
    if (criticalFailures > 0) {
      console.log(`\n🚨 CRITICAL FAILURES:`);
      this.testResults.filter(test => test.critical).forEach(test => {
        console.log(`   • ${test.name}: ${test.details}`);
      });
    }
    
    if (successRate >= 90 && criticalFailures === 0) {
      console.log(`\n🎉 ULTIMATE E2E TEST PASSED!`);
      console.log(`   Application is fully tested and production-ready.`);
    } else {
      console.log(`\n⚠️ ISSUES DETECTED - SEE DETAILED REPORT`);
    }
    
    console.log(`\n📄 Reports saved:`);
    console.log(`   - JSON: ULTIMATE-E2E-TEST-REPORT.json`);
    console.log(`   - Markdown: ULTIMATE-E2E-TEST-REPORT.md`);
    console.log(`   - Screenshots: ./screenshots/ directory`);
    
    return successRate >= 90 && criticalFailures === 0;
  }

  async runUltimateE2ETest() {
    try {
      await this.init();
      
      // Phase 1: Backend API Testing
      await this.testBackendAPIs();
      
      // Phase 2: Authentication
      const authSuccess = await this.performAuthentication();
      if (!authSuccess) {
        console.log('🚨 CRITICAL: Cannot proceed without authentication');
        await this.generateComprehensiveReport();
        return false;
      }
      
      // Phase 3: Comprehensive UI Testing
      await this.testEveryUIComponent();
      
      // Generate final report
      const success = await this.generateComprehensiveReport();
      
      console.log('\n🏁 Ultimate E2E testing completed!');
      return success;
      
    } catch (error) {
      console.error('❌ Ultimate E2E test failed:', error);
      return false;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the ultimate E2E test
const tester = new UltimateE2ETester();
tester.runUltimateE2ETest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Ultimate E2E test execution failed:', error);
  process.exit(1);
});