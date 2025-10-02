// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Core Web Vitals Observer
    try {
      const vitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.value || (entry as any).processingStart);
        }
      });
      vitalsObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      this.observers.push(vitalsObserver);
    } catch (error) {
      console.warn('Failed to initialize performance observer:', error);
    }

    // Resource Observer
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          this.recordMetric('resource_load_time', resource.duration);
          this.recordMetric('resource_size', resource.transferSize || 0);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Failed to initialize resource observer:', error);
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetric(name: string): number[] {
    return this.metrics.get(name) || [];
  }

  getAverageMetric(name: string): number {
    const values = this.getMetric(name);
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getAllMetrics(): Record<string, { average: number; latest: number; count: number }> {
    const result: Record<string, { average: number; latest: number; count: number }> = {};
    
    for (const [name, values] of this.metrics) {
      result[name] = {
        average: this.getAverageMetric(name),
        latest: values[values.length - 1] || 0,
        count: values.length
      };
    }
    
    return result;
  }

  // Measure component render time
  measureComponentRender<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    this.recordMetric(`component_render_${componentName}`, endTime - startTime);
    return result;
  }

  // Measure async operation
  async measureAsync<T>(operationName: string, asyncFn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await asyncFn();
      const endTime = performance.now();
      this.recordMetric(`async_${operationName}`, endTime - startTime);
      return result;
    } catch (error) {
      const endTime = performance.now();
      this.recordMetric(`async_${operationName}_error`, endTime - startTime);
      throw error;
    }
  }

  // Get memory usage if available
  getMemoryUsage(): number | null {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return null;
  }

  // Get Core Web Vitals
  getCoreWebVitals(): Record<string, number> {
    const vitals: Record<string, number> = {};
    
    // First Contentful Paint
    const fcpEntries = performance.getEntriesByName('first-contentful-paint');
    if (fcpEntries.length > 0) {
      vitals.FCP = fcpEntries[0].startTime;
    }

    // Largest Contentful Paint
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      vitals.LCP = lcpEntries[lcpEntries.length - 1].startTime;
    }

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      vitals.TTFB = navigation.responseStart - navigation.requestStart;
      vitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      vitals.loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
    }

    return vitals;
  }

  // Performance score (0-100)
  getPerformanceScore(): number {
    const vitals = this.getCoreWebVitals();
    let score = 100;
    
    // Deduct points based on thresholds
    if (vitals.FCP > 2000) score -= 20;
    else if (vitals.FCP > 1000) score -= 10;
    
    if (vitals.LCP > 4000) score -= 30;
    else if (vitals.LCP > 2500) score -= 15;
    
    if (vitals.TTFB > 800) score -= 25;
    else if (vitals.TTFB > 400) score -= 10;
    
    const avgRenderTime = this.getAverageMetric('component_render');
    if (avgRenderTime > 16) score -= 15; // 60fps threshold
    else if (avgRenderTime > 8) score -= 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Utility functions
export const performanceMonitor = PerformanceMonitor.getInstance();

export function withPerformanceTracking<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    return performanceMonitor.measureComponentRender(name, () => fn(...args));
  }) as T;
}

export async function withAsyncPerformanceTracking<T>(
  name: string,
  asyncFn: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measureAsync(name, asyncFn);
}

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = React.useState(performanceMonitor.getAllMetrics());
  const [score, setScore] = React.useState(performanceMonitor.getPerformanceScore());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getAllMetrics());
      setScore(performanceMonitor.getPerformanceScore());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { metrics, score };
}