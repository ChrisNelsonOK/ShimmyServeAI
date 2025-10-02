#!/usr/bin/env node

import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:5173';

async function debugTest() {
  console.log('🔍 DEBUGGING ELEMENT DETECTION...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Go to homepage
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔔 DEBUGGING NOTIFICATIONS BELL...');
    
    // Debug: Find all buttons and their content
    const allButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map((btn, index) => ({
        index,
        text: btn.textContent?.trim() || '',
        className: btn.className,
        innerHTML: btn.innerHTML.substring(0, 100),
        hasBell: btn.querySelector('[data-lucide="bell"]') ? true : false,
        hasBellSvg: btn.innerHTML.toLowerCase().includes('bell')
      }));
    });
    
    console.log('All buttons found:', allButtons);
    
    // Look for Bell specifically
    const bellElements = await page.evaluate(() => {
      // Multiple strategies to find bell
      const strategies = [];
      
      // Strategy 1: Look for lucide Bell component
      const lucideBells = document.querySelectorAll('[data-lucide="bell"]');
      strategies.push({ strategy: 'lucide-bell', count: lucideBells.length });
      
      // Strategy 2: Look for buttons containing svg with bell
      const buttons = Array.from(document.querySelectorAll('button'));
      const bellButtons = buttons.filter(btn => {
        const svg = btn.querySelector('svg');
        return svg && (
          svg.innerHTML.includes('bell') || 
          svg.getAttribute('data-lucide') === 'bell'
        );
      });
      strategies.push({ strategy: 'button-with-bell-svg', count: bellButtons.length });
      
      // Strategy 3: Look for Bell class from lucide-react
      const bellClasses = document.querySelectorAll('.lucide-bell');
      strategies.push({ strategy: 'lucide-bell-class', count: bellClasses.length });
      
      // Strategy 4: Look in header specifically
      const header = document.querySelector('header');
      if (header) {
        const headerButtons = header.querySelectorAll('button');
        const headerBellButtons = Array.from(headerButtons).filter(btn => {
          const svg = btn.querySelector('svg');
          return svg;
        });
        strategies.push({ strategy: 'header-buttons-with-svg', count: headerBellButtons.length });
      }
      
      return strategies;
    });
    
    console.log('Bell detection strategies:', bellElements);
    
    // Check if we're even logged in
    const loginStatus = await page.evaluate(() => {
      const indicators = [];
      
      if (document.querySelector('input[type="password"]')) {
        indicators.push('login-page');
      }
      
      if (document.querySelector('header')) {
        indicators.push('has-header');
      }
      
      if (document.querySelector('[data-testid="user-menu-button"]')) {
        indicators.push('user-menu-present');
      }
      
      return { indicators, url: window.location.href };
    });
    
    console.log('Login status:', loginStatus);
    
    // If we're on login page, try to login first
    if (loginStatus.indicators.includes('login-page')) {
      console.log('📋 Detected login page, attempting login...');
      
      // Direct API login
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
      
      console.log('Login result:', loginResult);
      
      if (loginResult.success) {
        await page.reload({ waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Re-check for bell after login
        const postLoginBell = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const bellButton = buttons.find(btn => {
            const svg = btn.querySelector('svg');
            return svg && (
              svg.innerHTML.includes('bell') || 
              svg.getAttribute('data-lucide') === 'bell'
            );
          });
          
          return {
            found: !!bellButton,
            buttonCount: buttons.length,
            headerExists: !!document.querySelector('header')
          };
        });
        
        console.log('Post-login bell check:', postLoginBell);
      }
    }
    
    // Now test settings page
    console.log('\n⚙️ DEBUGGING SETTINGS PAGE...');
    
    await page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const settingsDebug = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveButtons = buttons.filter(btn => 
        btn.textContent?.includes('Save') || 
        btn.textContent?.includes('save')
      );
      
      const inputs = document.querySelectorAll('input, select, textarea');
      
      return {
        totalButtons: buttons.length,
        saveButtons: saveButtons.map(btn => ({
          text: btn.textContent?.trim(),
          disabled: btn.disabled,
          className: btn.className
        })),
        totalInputs: inputs.length,
        hasSettingsContent: !!document.querySelector('h1, h2, h3'),
        url: window.location.href
      };
    });
    
    console.log('Settings page debug:', settingsDebug);
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugTest().catch(console.error);