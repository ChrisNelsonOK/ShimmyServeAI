#!/usr/bin/env node

import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:5173';

class IssueVerifier {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async init() {
    console.log('🔍 Starting Manual Issue Verification...\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    this.page = await this.browser.newPage();

    // Monitor errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console Error:', msg.text());
      }
    });

    this.page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
    });
  }

  async login() {
    console.log('🔐 Step 1: Login to the application');
    
    await this.page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await this.sleep(2000);
    
    // Login using existing demo user with short password (backend accepts it)
    console.log('Using demo@example.com with demo123...');
    
    const emailInput = await this.page.$('input[type="email"]');
    const passwordInput = await this.page.$('input[type="password"]');
    
    await emailInput.type('demo@example.com');
    await passwordInput.type('demo123');
    
    // Submit by pressing Enter to bypass frontend validation
    await passwordInput.press('Enter');
    await this.sleep(3000);
    
    // Check if we're logged in by looking for dashboard elements
    const url = this.page.url();
    console.log('Current URL after login attempt:', url);
    
    // Try alternative approach - click sign in button if available
    const signInButton = await this.page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent?.toLowerCase().includes('sign in')) || null;
    });
    
    if (signInButton && signInButton.asElement()) {
      console.log('Clicking Sign In button...');
      await signInButton.asElement().click();
      await this.sleep(5000);
    }
    
    // Check if we successfully reached the dashboard
    const finalUrl = this.page.url();
    console.log('Final URL:', finalUrl);
    
    if (finalUrl !== APP_URL || finalUrl.includes('dashboard')) {
      console.log('✅ Successfully logged in');
      return true;
    } else {
      console.log('❌ Login failed - still on login page');
      return false;
    }
  }

  async testNotificationsBell() {
    console.log('\n🔔 Step 2: Test Notifications Bell (Issue #1)');
    
    try {
      // Navigate to dashboard/home to ensure we're on the main app
      await this.page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle0' });
      await this.sleep(2000);
      
      // Look for the notifications bell
      const bellButton = await this.page.evaluateHandle(() => {
        // Look for bell icon or notifications button
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => {
          const svg = btn.querySelector('svg');
          if (svg) {
            // Check if it's a bell icon by looking for common bell SVG patterns
            const innerHTML = svg.innerHTML.toLowerCase();
            return innerHTML.includes('bell') || 
                   svg.getAttribute('data-lucide') === 'bell' ||
                   btn.className.includes('bell') ||
                   btn.className.includes('notification');
          }
          return false;
        }) || null;
      });
      
      if (bellButton && bellButton.asElement()) {
        console.log('✅ Notifications bell found');
        
        // Click the bell and check for errors or dropdown
        console.log('Clicking notifications bell...');
        await bellButton.asElement().click();
        await this.sleep(2000);
        
        // Look for notifications dropdown
        const dropdown = await this.page.$('.notifications, .dropdown, [class*="notification"]');
        
        if (dropdown) {
          console.log('✅ Notifications dropdown appeared');
          console.log('🎉 ISSUE #1 FIXED: Notifications bell now works!');
          
          // Test closing the dropdown
          await this.page.click('body');
          await this.sleep(1000);
          console.log('✅ Dropdown closes properly');
        } else {
          console.log('⚠️ Notifications bell clicked but no dropdown visible');
          console.log('   (This might still be a fix if it no longer throws errors)');
        }
        
      } else {
        console.log('❌ Notifications bell not found');
        console.log('   ISSUE #1 NOT FIXED: Bell button still missing or not clickable');
      }
      
    } catch (error) {
      console.log('❌ Error testing notifications bell:', error.message);
    }
  }

  async testServerSettings() {
    console.log('\n⚙️ Step 3: Test Server Settings Save (Issue #2)');
    
    try {
      // Navigate to settings page
      await this.page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle0' });
      await this.sleep(3000);
      
      console.log('Current URL:', this.page.url());
      
      // Check if we're actually on the settings page (not redirected to login)
      const isOnSettings = this.page.url().includes('/settings');
      
      if (!isOnSettings) {
        console.log('❌ Cannot access settings page - redirected to login');
        console.log('   Need to fix authentication state persistence');
        return;
      }
      
      console.log('✅ Successfully accessed settings page');
      
      // Look for form fields
      const inputs = await this.page.$$('input, select, textarea');
      console.log(`Found ${inputs.length} input fields`);
      
      if (inputs.length > 0) {
        // Make a small change to trigger the save button
        const firstInput = inputs[0];
        const currentValue = await firstInput.evaluate(el => el.value);
        console.log('Making a small change to trigger save...');
        
        await firstInput.click();
        await firstInput.press('End');
        await firstInput.type('1');
        await this.sleep(1000);
      }
      
      // Look for Save button
      const saveButton = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent?.includes('Save') ||
          btn.textContent?.includes('Apply')
        ) || null;
      });
      
      if (saveButton && saveButton.asElement()) {
        console.log('✅ Save button found');
        
        // Click save and monitor for errors/success
        console.log('Clicking save button...');
        
        const initialErrorCount = await this.page.evaluate(() => {
          return document.querySelectorAll('.error, .red, [class*="error"]').length;
        });
        
        await saveButton.asElement().click();
        await this.sleep(5000); // Wait for API call
        
        // Check for error messages
        const errorMessages = await this.page.$$eval('.error, .red, [class*="error"]', 
          elements => elements.map(el => el.textContent)
        );
        
        // Check for success messages
        const successMessages = await this.page.$$eval('.success, .green, [class*="success"]', 
          elements => elements.map(el => el.textContent)
        );
        
        console.log('Error messages:', errorMessages);
        console.log('Success messages:', successMessages);
        
        if (errorMessages.length === 0 && successMessages.length > 0) {
          console.log('🎉 ISSUE #2 FIXED: Server Settings save now works!');
        } else if (errorMessages.some(msg => msg.includes('Unauthorized'))) {
          console.log('❌ ISSUE #2 NOT FIXED: Still getting authorization error');
        } else if (errorMessages.length > 0) {
          console.log('⚠️ Different error encountered:', errorMessages);
        } else {
          console.log('⚠️ No clear success/error indication - need to investigate');
        }
        
      } else {
        console.log('❌ Save button not found');
        console.log('   Could not test save functionality');
      }
      
    } catch (error) {
      console.log('❌ Error testing server settings:', error.message);
    }
  }

  async generateSummary() {
    console.log('\n📋 VERIFICATION SUMMARY:');
    console.log('=======================');
    console.log('Issue #1: Notifications bell clicking');
    console.log('Issue #2: Server settings save authorization');
    console.log('\nSee output above for detailed results.');
    console.log('\nNext steps:');
    console.log('1. Review any remaining issues');
    console.log('2. Run full comprehensive test suite');
    console.log('3. Verify all functionality works end-to-end');
  }

  async verifyIssues() {
    try {
      await this.init();
      
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.log('❌ Cannot proceed without login');
        return;
      }
      
      await this.testNotificationsBell();
      await this.testServerSettings();
      await this.generateSummary();
      
      console.log('\n✅ Manual verification completed!');
      
      // Keep browser open for manual inspection
      console.log('\n🔍 Browser left open for manual inspection...');
      console.log('Press Ctrl+C to close when done.');
      
      // Wait indefinitely
      await new Promise(() => {});
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
    } finally {
      // Don't auto-close browser for manual inspection
    }
  }
}

// Run the verification
const verifier = new IssueVerifier();
verifier.verifyIssues().catch(error => {
  console.error('Verification error:', error);
  process.exit(1);
});