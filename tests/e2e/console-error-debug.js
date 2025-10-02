#!/usr/bin/env node

import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:5173';

async function debugConsoleErrors() {
  console.log('🐛 DEBUGGING CONSOLE ERRORS AND COMPONENT RENDERING...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
    
    if (msg.type() === 'error') {
      console.error('❌ Console Error:', msg.text());
    } else if (msg.type() === 'warn') {
      console.warn('⚠️ Console Warning:', msg.text());
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.error('💥 Page Error:', error.message);
    consoleMessages.push({
      type: 'pageerror',
      text: error.message,
      timestamp: new Date().toISOString()
    });
  });
  
  // Capture network failures
  page.on('requestfailed', request => {
    if (!request.url().includes('favicon')) {
      console.error('🌐 Network Failed:', request.url(), request.failure().errorText);
      consoleMessages.push({
        type: 'network',
        text: `${request.url()} - ${request.failure().errorText}`,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  try {
    // Navigate to the app
    console.log('📱 Loading application...');
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Login via API
    console.log('🔐 Performing API login...');
    const loginResult = await page.evaluate(async () => {
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
      console.log('✅ Login successful, reloading page...');
      await page.reload({ waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.error('❌ Login failed:', loginResult.error);
    }
    
    // Check React component tree and rendering
    console.log('🔍 Analyzing React component rendering...');
    const componentAnalysis = await page.evaluate(() => {
      // Check if React DevTools are available
      const hasReact = typeof window.React !== 'undefined' || typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';
      
      // Check DOM structure
      const header = document.querySelector('header');
      const headerAnalysis = header ? {
        exists: true,
        innerHTML: header.innerHTML.substring(0, 500),
        childCount: header.children.length,
        buttons: Array.from(header.querySelectorAll('button')).length
      } : { exists: false };
      
      // Check for Settings component
      const settingsContainer = document.querySelector('[class*="Settings"], .settings, #settings');
      const settingsAnalysis = settingsContainer ? {
        exists: true,
        innerHTML: settingsContainer.innerHTML.substring(0, 500),
        buttons: Array.from(settingsContainer.querySelectorAll('button')).length
      } : { exists: false };
      
      // Check main app container
      const root = document.getElementById('root');
      const rootAnalysis = root ? {
        exists: true,
        childCount: root.children.length,
        innerHTML: root.innerHTML.substring(0, 300)
      } : { exists: false };
      
      return {
        hasReact,
        url: window.location.href,
        title: document.title,
        header: headerAnalysis,
        settings: settingsAnalysis,
        root: rootAnalysis,
        bodyClasses: document.body.className,
        htmlClasses: document.documentElement.className
      };
    });
    
    console.log('📊 Component Analysis:', JSON.stringify(componentAnalysis, null, 2));
    
    // Check for specific Lucide React imports
    console.log('🎨 Checking Lucide React icons...');
    const iconCheck = await page.evaluate(() => {
      // Check if Lucide icons are loaded
      const svgs = Array.from(document.querySelectorAll('svg'));
      const lucideIcons = svgs.filter(svg => 
        svg.getAttribute('data-lucide') || 
        svg.classList.contains('lucide') ||
        svg.innerHTML.includes('stroke="currentColor"')
      );
      
      return {
        totalSVGs: svgs.length,
        lucideIcons: lucideIcons.length,
        iconTypes: lucideIcons.map(icon => ({
          dataLucide: icon.getAttribute('data-lucide'),
          classes: icon.className.toString(),
          parent: icon.parentElement?.tagName
        }))
      };
    });
    
    console.log('🎨 Icon Analysis:', JSON.stringify(iconCheck, null, 2));
    
    // Test settings page specifically
    console.log('⚙️ Testing settings page...');
    await page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const settingsPageAnalysis = await page.evaluate(() => {
      const content = document.body.innerHTML;
      
      return {
        url: window.location.href,
        hasServerSettings: content.includes('Server Settings'),
        hasSaveButton: content.includes('Save Changes') || content.includes('Save'),
        hasInputs: document.querySelectorAll('input').length,
        hasConfigSections: content.includes('General Settings'),
        contentLength: content.length
      };
    });
    
    console.log('⚙️ Settings Page Analysis:', JSON.stringify(settingsPageAnalysis, null, 2));
    
    // Summary
    console.log('\n📋 CONSOLE ERROR SUMMARY:');
    const errorCount = consoleMessages.filter(msg => msg.type === 'error' || msg.type === 'pageerror').length;
    const warningCount = consoleMessages.filter(msg => msg.type === 'warn').length;
    
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Warnings: ${warningCount}`);
    console.log(`   Total Messages: ${consoleMessages.length}`);
    
    if (errorCount > 0) {
      console.log('\n❌ ERRORS FOUND:');
      consoleMessages
        .filter(msg => msg.type === 'error' || msg.type === 'pageerror')
        .forEach(msg => console.log(`   ${msg.timestamp}: ${msg.text}`));
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugConsoleErrors().catch(console.error);