// Test utilities for comprehensive application testing
export interface TestResult {
  component: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  timestamp: Date;
}

export class TestSuite {
  private results: TestResult[] = [];
  
  constructor(private componentName: string) {}
  
  async test(testName: string, testFn: () => Promise<boolean> | boolean, expectedResult = true): Promise<void> {
    try {
      const result = await Promise.resolve(testFn());
      const passed = result === expectedResult;
      
      this.results.push({
        component: this.componentName,
        test: testName,
        status: passed ? 'pass' : 'fail',
        message: passed ? 'Test passed successfully' : `Expected ${expectedResult}, got ${result}`,
        timestamp: new Date()
      });
    } catch (error) {
      this.results.push({
        component: this.componentName,
        test: testName,
        status: 'fail',
        message: `Test threw error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }
  }
  
  getResults(): TestResult[] {
    return [...this.results];
  }
  
  clear(): void {
    this.results = [];
  }
  
  getPassRate(): number {
    if (this.results.length === 0) return 0;
    const passed = this.results.filter(r => r.status === 'pass').length;
    return (passed / this.results.length) * 100;
  }
}

// Global test runner
export class GlobalTestRunner {
  private static instance: GlobalTestRunner;
  private testSuites: TestSuite[] = [];
  
  static getInstance(): GlobalTestRunner {
    if (!GlobalTestRunner.instance) {
      GlobalTestRunner.instance = new GlobalTestRunner();
    }
    return GlobalTestRunner.instance;
  }
  
  addSuite(suite: TestSuite): void {
    this.testSuites.push(suite);
  }
  
  getAllResults(): TestResult[] {
    return this.testSuites.flatMap(suite => suite.getResults());
  }
  
  getOverallPassRate(): number {
    const allResults = this.getAllResults();
    if (allResults.length === 0) return 0;
    const passed = allResults.filter(r => r.status === 'pass').length;
    return (passed / allResults.length) * 100;
  }
  
  getComponentResults(componentName: string): TestResult[] {
    return this.getAllResults().filter(r => r.component === componentName);
  }
  
  clear(): void {
    this.testSuites.forEach(suite => suite.clear());
    this.testSuites = [];
  }
}

// DOM testing utilities
export const domTestUtils = {
  // Check if element exists and is visible
  isElementVisible: (selector: string): boolean => {
    const element = document.querySelector(selector);
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  },
  
  // Check if element has correct text content
  hasTextContent: (selector: string, expectedText: string): boolean => {
    const element = document.querySelector(selector);
    return element?.textContent?.trim() === expectedText;
  },
  
  // Check if form field has validation error
  hasFormError: (fieldId: string): boolean => {
    const errorElement = document.querySelector(`#${fieldId}-error`);
    return errorElement !== null && domTestUtils.isElementVisible(`#${fieldId}-error`);
  },
  
  // Check if button is disabled
  isButtonDisabled: (selector: string): boolean => {
    const button = document.querySelector(selector) as HTMLButtonElement;
    return button?.disabled === true;
  },
  
  // Simulate form input
  simulateInput: (selector: string, value: string): void => {
    const input = document.querySelector(selector) as HTMLInputElement;
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  },
  
  // Simulate button click
  simulateClick: (selector: string): void => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.click();
    }
  },
  
  // Wait for element to appear
  waitForElement: (selector: string, timeout = 5000): Promise<Element> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        } else {
          setTimeout(check, 100);
        }
      };
      
      check();
    });
  },
  
  // Check if all required form fields are filled
  areRequiredFieldsFilled: (formSelector: string): boolean => {
    const form = document.querySelector(formSelector) as HTMLFormElement;
    if (!form) return false;
    
    const requiredFields = form.querySelectorAll('[required]') as NodeListOf<HTMLInputElement>;
    return Array.from(requiredFields).every(field => field.value.trim() !== '');
  }
};

// API testing utilities
export const apiTestUtils = {
  // Mock successful API response
  mockSuccessResponse: <T>(data: T): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(data), 100));
  },
  
  // Mock failed API response
  mockErrorResponse: (message: string): Promise<never> => {
    return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), 100));
  },
  
  // Test API endpoint availability
  testEndpoint: async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
};

// Performance testing utilities
export const performanceTestUtils = {
  // Measure component render time
  measureRenderTime: async (componentRenderer: () => Promise<void>): Promise<number> => {
    const startTime = performance.now();
    await componentRenderer();
    const endTime = performance.now();
    return endTime - startTime;
  },
  
  // Check memory usage
  getMemoryUsage: (): number | null => {
    // @ts-ignore - performance.memory is not in all browsers
    return (performance as any).memory?.usedJSHeapSize || null;
  },
  
  // Test loading times
  testLoadingTime: (threshold: number = 1000): (renderTime: number) => boolean => {
    return (renderTime: number) => renderTime < threshold;
  }
};