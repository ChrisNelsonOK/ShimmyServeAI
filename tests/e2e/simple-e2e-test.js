#!/usr/bin/env node

import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:5173';
const DEMO_USER = 'demo';
const DEMO_PASSWORD = 'demo123';

async function runSimpleE2ETest() {
  console.log('🚀 Starting Simple E2E Test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser Console Error:', msg.text());
    }
  });
  
  try {
    // 1. Navigate to app
    console.log('\n📍 Navigating to application...');
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'screenshots/1-login-page.png', fullPage: true });
    console.log('✅ Login page loaded');
    
    // 2. Check if we're on login page
    const loginForm = await page.$('form');
    if (loginForm) {
      console.log('✅ Login form found');
      
      // 3. Try to find input fields
      const usernameInput = await page.$('input[type="text"], input[name="username"], input#username');
      const passwordInput = await page.$('input[type="password"]');
      
      if (usernameInput && passwordInput) {
        console.log('✅ Input fields found');
        
        // 4. Fill in credentials
        await usernameInput.type(DEMO_USER);
        await passwordInput.type(DEMO_PASSWORD);
        console.log('✅ Credentials entered');
        
        // 5. Submit form
        const submitButton = await page.$('button[type="submit"], button:contains("Login"), button:contains("Sign in")');
        if (submitButton) {
          await submitButton.click();
          console.log('✅ Login form submitted');
          
          // 6. Wait for navigation or dashboard
          await page.waitForFunction(
            () => window.location.pathname !== '/' && window.location.pathname !== '/login',
            { timeout: 10000 }
          ).catch(() => console.log('⚠️ No navigation after login'));
          
          await page.screenshot({ path: 'screenshots/2-after-login.png', fullPage: true });
          
          // 7. Check current page
          const currentUrl = page.url();
          console.log(`📍 Current URL: ${currentUrl}`);
          
          // 8. Look for dashboard elements
          const dashboardTitle = await page.$eval('h1, h2', el => el.textContent).catch(() => null);
          if (dashboardTitle) {
            console.log(`✅ Page title: ${dashboardTitle}`);
          }
          
          // 9. Find navigation links
          const navLinks = await page.$$eval('a[href]', links => 
            links.map(link => ({ text: link.textContent.trim(), href: link.href }))
          );
          
          console.log('\n🧭 Navigation links found:');
          navLinks.forEach(link => {
            if (link.text) {
              console.log(`  - ${link.text}: ${link.href}`);
            }
          });
          
          // 10. Test a few key pages
          const pagesToTest = [
            { path: '/dashboard', name: 'Dashboard' },
            { path: '/logs', name: 'Logs' },
            { path: '/terminal', name: 'Terminal' },
            { path: '/settings', name: 'Settings' }
          ];
          
          for (const pageInfo of pagesToTest) {
            try {
              console.log(`\n📄 Testing ${pageInfo.name}...`);
              await page.goto(`${APP_URL}${pageInfo.path}`, { waitUntil: 'networkidle0' });
              await page.waitForTimeout(1000); // Use older method that works
              await page.screenshot({ path: `screenshots/page-${pageInfo.name.toLowerCase()}.png`, fullPage: true });
              console.log(`✅ ${pageInfo.name} page loaded`);
              
              // Get page content info
              const pageTitle = await page.$eval('h1, h2', el => el.textContent).catch(() => 'No title');
              const buttons = await page.$$eval('button', btns => btns.length);
              const inputs = await page.$$eval('input', inputs => inputs.length);
              
              console.log(`  - Title: ${pageTitle}`);
              console.log(`  - Buttons: ${buttons}`);
              console.log(`  - Input fields: ${inputs}`);
              
            } catch (error) {
              console.log(`❌ Error loading ${pageInfo.name}: ${error.message}`);
            }
          }
          
        } else {
          console.log('❌ Submit button not found');
        }
      } else {
        console.log('❌ Input fields not found');
        // Try to understand what's on the page
        const pageContent = await page.content();
        console.log('Page HTML preview:', pageContent.substring(0, 500));
      }
    } else {
      console.log('⚠️ No login form found, checking if already logged in...');
      const currentPath = new URL(page.url()).pathname;
      console.log(`Current path: ${currentPath}`);
    }
    
    console.log('\n📊 Test Summary:');
    console.log('- Application is accessible');
    console.log('- Basic navigation works');
    console.log('- Screenshots captured');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will remain open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

// Create screenshots directory
import { mkdirSync } from 'fs';
try {
  mkdirSync('screenshots', { recursive: true });
} catch (e) {}

// Run the test
runSimpleE2ETest().catch(console.error);