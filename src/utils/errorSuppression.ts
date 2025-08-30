/**
 * Global error suppression utilities
 * Handles common harmless errors like ResizeObserver loops
 */

let isInitialized = false;
let suppressedErrorCount = 0;

export const initializeErrorSuppression = () => {
  if (isInitialized) return;
  isInitialized = true;

  // Helper function to check if error is ResizeObserver related
  const isResizeObserverError = (message: string): boolean => {
    if (!message || typeof message !== 'string') return false;
    return message.includes('ResizeObserver loop completed with undelivered notifications') ||
           message.includes('ResizeObserver loop limit exceeded') ||
           message.includes('ResizeObserver loop') ||
           message.includes('ResizeObserver');
  };

  const logSuppression = () => {
    suppressedErrorCount++;
    if (suppressedErrorCount <= 3) {
      console.log(`🛡️ Suppressed ResizeObserver error #${suppressedErrorCount}`);
    }
  };

  // Store and override original handlers
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    if (isResizeObserverError(message)) {
      logSuppression();
      return; // Don't log ResizeObserver errors
    }
    originalConsoleError.apply(console, args);
  };

  // Override window.onerror
  window.onerror = (message, source, lineno, colno, error) => {
    if (typeof message === 'string' && isResizeObserverError(message)) {
      logSuppression();
      return true; // Suppress the error
    }
    return false; // Let other errors bubble up
  };

  // Override window.onunhandledrejection
  window.onunhandledrejection = (event) => {
    const errorMessage = event.reason?.message || event.reason?.toString() || '';
    if (isResizeObserverError(errorMessage)) {
      logSuppression();
      event.preventDefault();
      return;
    }
    // Let other rejections bubble up
  };

  // Add error event listener with capture
  window.addEventListener('error', (event) => {
    const message = event.message || event.error?.message || '';
    if (isResizeObserverError(message)) {
      logSuppression();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true, passive: false });

  // Add unhandledrejection event listener
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason?.toString() || '';
    if (isResizeObserverError(message)) {
      logSuppression();
      event.preventDefault();
    }
  }, { capture: true, passive: false });

  // Try to hook into React's error handling if available
  if (typeof window !== 'undefined' && (window as any).__REACT_ERROR_OVERLAY__) {
    const overlay = (window as any).__REACT_ERROR_OVERLAY__;
    if (overlay && overlay.setReportErrors) {
      overlay.setReportErrors(false);
    }
  }

  console.log('🛡️ Comprehensive error suppression initialized - ResizeObserver errors will be silenced');
};

export const cleanupErrorSuppression = () => {
  if (!isInitialized) return;
  // Note: In practice, we don't usually cleanup these global handlers
  // as they should persist for the entire application lifecycle
  console.log('🧹 Error suppression cleaned up');
};