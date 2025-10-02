#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

const APP_URL = 'http://localhost:5173';

async function manualVerificationTest() {
  console.log('🔍 MANUAL VERIFICATION TEST - CHECKING ACTUAL RENDERING');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take initial screenshot
    await page.screenshot({ path: 'verification-01-initial.png', fullPage: true });
    console.log('📸 Screenshot 1: Initial page state');
    
    // Login via API
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
    
    console.log('🔐 Login result:', loginResult);
    
    if (loginResult.success) {
      await page.reload({ waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Take screenshot after login
      await page.screenshot({ path: 'verification-02-after-login.png', fullPage: true });
      console.log('📸 Screenshot 2: After successful login');
      
      // Check for header elements
      const headerAnalysis = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return { hasHeader: false };
        
        const buttons = Array.from(header.querySelectorAll('button'));
        const svgs = Array.from(header.querySelectorAll('svg'));
        
        return {
          hasHeader: true,
          headerHTML: header.innerHTML,
          buttonCount: buttons.length,
          svgCount: svgs.length,
          buttonTexts: buttons.map(btn => btn.textContent?.trim() || 'NO TEXT'),
          svgData: svgs.map(svg => ({
            parent: svg.parentElement?.tagName,
            dataLucide: svg.getAttribute('data-lucide'),
            innerHTML: svg.innerHTML.substring(0, 100)
          }))
        };
      });
      
      console.log('🔍 Header Analysis:', JSON.stringify(headerAnalysis, null, 2));
      
      // Navigate to settings
      await page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take settings screenshot
      await page.screenshot({ path: 'verification-03-settings.png', fullPage: true });
      console.log('📸 Screenshot 3: Settings page');
      
      // Check settings page content
      const settingsAnalysis = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
        
        return {
          url: window.location.href,
          totalButtons: buttons.length,
          totalInputs: inputs.length,
          buttonTexts: buttons.map(btn => btn.textContent?.trim() || 'NO TEXT'),
          hasSettingsTitle: !!document.querySelector('h1, h2, h3'),
          bodyContent: document.body.innerHTML.substring(0, 1000) + '...'
        };
      });
      
      console.log('⚙️ Settings Analysis:', JSON.stringify(settingsAnalysis, null, 2));
      
      // Wait for manual inspection
      console.log('\n⏳ PAUSING FOR MANUAL INSPECTION...');
      console.log('   Please examine the browser window to verify:');
      console.log('   1. Is the notifications bell visible in the header?');
      console.log('   2. Are there Save buttons on the settings page?');
      console.log('   3. Do the components look correct?');
      console.log('\n   Screenshots saved as:');
      console.log('   - verification-01-initial.png');
      console.log('   - verification-02-after-login.png');
      console.log('   - verification-03-settings.png');
      console.log('\n🔍 Press Ctrl+C when ready to close browser');
      
      // Wait indefinitely for manual inspection
      await new Promise(() => {});
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Browser will stay open for manual inspection
  }
}

manualVerificationTest().catch(console.error);