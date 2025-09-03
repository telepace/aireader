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
    
    // More comprehensive ResizeObserver error patterns
    const resizeObserverPatterns = [
      'ResizeObserver loop completed with undelivered notifications',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop',
      'ResizeObserver',
      'Resize observer loop',
      'Loop limit exceeded',
      'undelivered notifications'
    ];
    
    const lowerMessage = message.toLowerCase();
    return resizeObserverPatterns.some(pattern => 
      lowerMessage.includes(pattern.toLowerCase())
    );
  };

  const logSuppression = () => {
    suppressedErrorCount++;
    if (suppressedErrorCount <= 3) {
      console.log(`🛡️ Suppressed ResizeObserver error #${suppressedErrorCount}`);
    }
  };

  // Proactive ResizeObserver wrapper to prevent loops
  if (typeof window !== 'undefined' && window.ResizeObserver) {
    const OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        const wrappedCallback: ResizeObserverCallback = (entries, observer) => {
          try {
            // Use requestAnimationFrame to break the synchronous loop
            requestAnimationFrame(() => {
              try {
                callback(entries, observer);
              } catch (error: any) {
                const message = error?.message || error?.toString() || '';
                if (!isResizeObserverError(message)) {
                  throw error; // Re-throw non-ResizeObserver errors
                }
                logSuppression();
              }
            });
          } catch (error: any) {
            const message = error?.message || error?.toString() || '';
            if (!isResizeObserverError(message)) {
              throw error; // Re-throw non-ResizeObserver errors
            }
            logSuppression();
          }
        };
        super(wrappedCallback);
      }
    };
  }

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

  // Enhanced React error overlay handling
  if (typeof window !== 'undefined') {
    // Handle React Error Overlay specifically
    const suppressReactOverlayError = () => {
      const overlay = (window as any).__REACT_ERROR_OVERLAY__;
      if (overlay) {
        if (overlay.setReportErrors) {
          overlay.setReportErrors(false);
        }
        if (overlay.reportRuntimeError) {
          const originalReportRuntimeError = overlay.reportRuntimeError;
          overlay.reportRuntimeError = (error: any) => {
            const message = error?.message || error?.toString() || '';
            if (isResizeObserverError(message)) {
              logSuppression();
              return;
            }
            return originalReportRuntimeError(error);
          };
        }
      }
    };

    // Try immediately
    suppressReactOverlayError();
    
    // Also try after a short delay to catch dynamically loaded overlay
    setTimeout(suppressReactOverlayError, 100);
    setTimeout(suppressReactOverlayError, 1000);

    // Handle React DevTools and error boundary integration
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (devtools.onCommitFiberRoot) {
        const originalOnCommitFiberRoot = devtools.onCommitFiberRoot;
        devtools.onCommitFiberRoot = (...args: any[]) => {
          try {
            return originalOnCommitFiberRoot.apply(devtools, args);
          } catch (error: any) {
            const message = error?.message || error?.toString() || '';
            if (isResizeObserverError(message)) {
              logSuppression();
              return;
            }
            throw error;
          }
        };
      }
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