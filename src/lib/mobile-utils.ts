// Mobile Utilities for Tauri v2 Mobile Apps

/**
 * Detect if app is running on mobile
 */
export function isMobile(): boolean {
  // Check if running on Tauri mobile
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    const platform = navigator.userAgent.toLowerCase();
    return platform.includes('android') || platform.includes('iphone') || platform.includes('ipad');
  }
  
  // Fallback to screen size check
  return window.innerWidth < 768;
}

/**
 * Detect if device is in portrait mode
 */
export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

/**
 * Detect if device is in landscape mode
 */
export function isLandscape(): boolean {
  return window.innerWidth > window.innerHeight;
}

/**
 * Get safe area insets for notched devices
 */
export function getSafeAreaInsets() {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
  };
}

/**
 * Trigger haptic feedback (Tauri v2 mobile)
 */
export async function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light') {
  if (!isMobile()) return;
  
  try {
    // @ts-ignore - Tauri v2 haptics plugin
    const { haptics } = await import('@tauri-apps/plugin-haptics');
    
    switch (type) {
      case 'light':
        await haptics.impact({ style: 'Light' });
        break;
      case 'medium':
        await haptics.impact({ style: 'Medium' });
        break;
      case 'heavy':
        await haptics.impact({ style: 'Heavy' });
        break;
      case 'selection':
        await haptics.selection();
        break;
      case 'success':
        await haptics.notification({ type: 'Success' });
        break;
      case 'warning':
        await haptics.notification({ type: 'Warning' });
        break;
      case 'error':
        await haptics.notification({ type: 'Error' });
        break;
    }
  } catch (error) {
    // Haptics not available or error
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Open barcode scanner (Tauri v2 mobile)
 */
export async function scanBarcode(): Promise<string | null> {
  try {
    // @ts-ignore - Tauri v2 barcode scanner plugin
    const { scan } = await import('@tauri-apps/plugin-barcode-scanner');
    const result = await scan();
    return result.content || null;
  } catch (error) {
    console.error('Barcode scanner error:', error);
    return null;
  }
}

/**
 * Check if device has notch/cutout
 */
export function hasNotch(): boolean {
  return getSafeAreaInsets().top > 20;
}

/**
 * Get optimal touch target size
 */
export function getTouchTargetSize(): number {
  return isMobile() ? 44 : 32; // 44px for mobile (Apple HIG standard)
}

/**
 * Add touch ripple effect
 */
export function addTouchRipple(element: HTMLElement, event: TouchEvent | MouseEvent) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  
  const x = (event as TouchEvent).touches 
    ? (event as TouchEvent).touches[0].clientX - rect.left
    : (event as MouseEvent).clientX - rect.left;
  const y = (event as TouchEvent).touches
    ? (event as TouchEvent).touches[0].clientY - rect.top
    : (event as MouseEvent).clientY - rect.top;
  
  ripple.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: ripple 0.6s ease-out;
  `;
  
  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
}

/**
 * Prevent overscroll bounce on mobile
 */
export function preventOverscroll() {
  if (!isMobile()) return;
  
  document.body.style.overscrollBehavior = 'none';
  document.documentElement.style.overscrollBehavior = 'none';
}

/**
 * Enable smooth scrolling
 */
export function enableSmoothScroll() {
  document.documentElement.style.scrollBehavior = 'smooth';
}

/**
 * Disable text selection on touch
 */
export function disableTextSelection(element: HTMLElement) {
  element.style.userSelect = 'none';
  element.style.webkitUserSelect = 'none';
  // @ts-ignore - webkit specific property
  element.style.webkitTouchCallout = 'none';
}

/**
 * Format number for mobile keyboards
 */
export function getMobileInputMode(type: 'text' | 'number' | 'tel' | 'email' | 'url' | 'decimal' = 'text'): string {
  if (!isMobile()) return 'text';
  return type;
}
