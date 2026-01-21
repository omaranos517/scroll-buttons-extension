// Modern Scroll Buttons Extension
// Handles both window scrolling and scrollable divs

class ModernScrollButtons {
  constructor() {
    this.scrollTopBtn = null;
    this.scrollBottomBtn = null;
    this.scrollContainer = null;
    this.isWindowScrolling = true;
    this.observer = null;
    this.lastScrollHeight = 0;
    this.animationFrameId = null;
    
    // Default settings
    this.settings = {
      showTopButton: true,
      showBottomButton: true,
      showProgressRing: true,
      showTooltips: true,
      customScrollEnabled: false,
      topScrollPosition: 0,
      bottomScrollPosition: 100,
      scrollType: 'percentage',
      smoothScrolling: true,
      enableShortcuts: true
    };
    
    this.init();
  }

    async init() {
    // Load settings first
    await this.loadSettings();
    this.findScrollContainer();
    this.createButtons();
    this.setupEventListeners();
    this.setupMutationObserver();
    this.updateButtons();
  }

  async loadSettings() {
    try {
      // Try Chrome storage API first
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        const savedSettings = await chrome.storage.sync.get(this.settings);
        this.settings = { ...this.settings, ...savedSettings };
      } else {
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('modernScrollButtonsSettings');
        if (savedSettings) {
          this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
      }
    } catch (error) {
      console.error('ModernScrollButtons: Error loading settings:', error);
      
      // Fallback to localStorage
      try {
        const savedSettings = localStorage.getItem('modernScrollButtonsSettings');
        if (savedSettings) {
          this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
      } catch (e) {
        console.error('ModernScrollButtons: Error loading from localStorage:', e);
      }
    }
  
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Save to storage
    this.saveSettings();
    
    // Apply immediately
    this.applySettings();
  }

  async saveSettings() {
    try {
      // Try Chrome storage first
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set(this.settings);
      } else {
        // Fallback to localStorage
        localStorage.setItem('modernScrollButtonsSettings', JSON.stringify(this.settings));
      }
    } catch (error) {
      console.error('ModernScrollButtons: Error saving settings:', error);
      
      // Fallback to localStorage
      try {
        localStorage.setItem('modernScrollButtonsSettings', JSON.stringify(this.settings));
      } catch (e) {
        console.error('ModernScrollButtons: Error saving to localStorage:', e);
      }
    }
  }
  
  applySettings() {
    if (!this.scrollTopBtn || !this.scrollBottomBtn) return;
    
    // Update button visibility
    this.scrollTopBtn.style.display = this.settings.showTopButton ? 'flex' : 'none';
    this.scrollBottomBtn.style.display = this.settings.showBottomButton ? 'flex' : 'none';
    
    // Update progress ring visibility
    const progressRings = document.querySelectorAll('.scroll-progress-ring');
    progressRings.forEach(ring => {
      ring.style.display = this.settings.showProgressRing ? 'block' : 'none';
    });
    
    // Update tooltip visibility
    const tooltips = document.querySelectorAll('.scroll-button-tooltip');
    tooltips.forEach(tooltip => {
      tooltip.style.display = this.settings.showTooltips ? 'block' : 'none';
    });
    
    this.updateButtons();
  }
  
  // Find the main scroll container (window or div)
  findScrollContainer() {
    console.log('ModernScrollButtons: Finding scroll container...');
    
    // Try common containers first for better performance
    const commonContainers = [
      // DeepSeek chat specific
      '.relative.h-full',
      '.flex.flex-col.items-center',
      '.flex-1.overflow-hidden',
      '.overflow-y-auto',
      '.scrollbar',
      
      // Generic selectors
      'main',
      'article',
      '.main-content',
      '.content',
      '.scroll-container',
      '.chat-container',
      '.messages-wrapper',
      '.conversation',
      '[role="main"]',
      '[class*="scroll"]',
      '[class*="overflow"]'
    ];

    // Check common containers first
    for (const selector of commonContainers) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (this.isElementScrollable(element)) {
            console.log(`ModernScrollButtons: Found scrollable container with selector: ${selector}`);
            this.scrollContainer = element;
            this.isWindowScrolling = false;
            return;
          }
        }
      } catch (e) {
        // Ignore selector errors
      }
    }

    // Fallback: Check window scrolling
    const windowScrollable = document.documentElement.scrollHeight > window.innerHeight;
    if (windowScrollable) {
      console.log('ModernScrollButtons: Using window as scroll container');
      this.scrollContainer = window;
      this.isWindowScrolling = true;
      return;
    }

    // Last resort: Find any scrollable element
    console.log('ModernScrollButtons: Scanning for scrollable elements...');
    const allElements = document.querySelectorAll('*');
    let bestContainer = null;
    let maxScrollHeight = 0;

    for (const element of allElements) {
      if (element === document.body || element === document.documentElement) continue;
      if (element.offsetHeight < 300) continue;
      
      if (this.isElementScrollable(element)) {
        if (element.scrollHeight > maxScrollHeight) {
          maxScrollHeight = element.scrollHeight;
          bestContainer = element;
        }
      }
    }

    if (bestContainer) {
      console.log('ModernScrollButtons: Found best scrollable container');
      this.scrollContainer = bestContainer;
      this.isWindowScrolling = false;
    } else {
      console.log('ModernScrollButtons: No scrollable container found, defaulting to window');
      this.scrollContainer = window;
      this.isWindowScrolling = true;
    }
  }

  isElementScrollable(element) {
    try {
      const styles = window.getComputedStyle(element);
      const isScrollable = (
        (styles.overflowY === 'scroll' || styles.overflowY === 'auto') &&
        element.scrollHeight > element.clientHeight + 10 // +10 for tolerance
      );
      
      // Also check if element has scroll events (for dynamic content)
      if (isScrollable) {
        const hasScroll = element.scrollHeight > element.offsetHeight;
        return hasScroll;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  createButtons() {
    // Remove existing buttons if any
    this.removeButtons();

    // Create top button
    this.scrollTopBtn = document.createElement('button');
    this.scrollTopBtn.id = 'modernScrollTopBtn';
    this.scrollTopBtn.setAttribute('aria-label', 'Scroll to top');
    this.scrollTopBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
      <svg class="scroll-progress-ring" width="44" height="44">
        <circle class="scroll-progress-circle" cx="24" cy="24" r="22"></circle>
        <circle class="scroll-progress-fill" cx="24" cy="24" r="22"></circle>
      </svg>
      <span class="scroll-button-tooltip">Scroll to Top</span>
    `;

    // Create bottom button
    this.scrollBottomBtn = document.createElement('button');
    this.scrollBottomBtn.id = 'modernScrollBottomBtn';
    this.scrollBottomBtn.setAttribute('aria-label', 'Scroll to bottom');
    this.scrollBottomBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 5v14M19 12l-7 7-7-7"/>
      </svg>
      <svg class="scroll-progress-ring" width="44" height="44">
        <circle class="scroll-progress-circle" cx="24" cy="24" r="22"></circle>
        <circle class="scroll-progress-fill" cx="24" cy="24" r="22"></circle>
      </svg>
      <span class="scroll-button-tooltip">Scroll to Bottom</span>
    `;

    // Add buttons to body
    document.body.appendChild(this.scrollTopBtn);
    document.body.appendChild(this.scrollBottomBtn);

    // Add click handlers with debouncing
    let lastClickTime = 0;
    const clickHandler = (handler) => (e) => {
      const now = Date.now();
      if (now - lastClickTime > 300) { // 300ms debounce
        lastClickTime = now;
        handler.call(this);
      }
    };

    this.scrollTopBtn.addEventListener('click', clickHandler(this.scrollToTop));
    this.scrollBottomBtn.addEventListener('click', clickHandler(this.scrollToBottom));
  }

  getScrollInfo() {
    try {
      if (this.isWindowScrolling) {
        return {
          scrollTop: window.pageYOffset || document.documentElement.scrollTop,
          scrollHeight: Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          ),
          clientHeight: window.innerHeight,
          maxScroll: Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          ) - window.innerHeight
        };
      } else if (this.scrollContainer) {
        return {
          scrollTop: this.scrollContainer.scrollTop,
          scrollHeight: this.scrollContainer.scrollHeight,
          clientHeight: this.scrollContainer.clientHeight,
          maxScroll: this.scrollContainer.scrollHeight - this.scrollContainer.clientHeight
        };
      }
    } catch (e) {
      console.error('ModernScrollButtons: Error getting scroll info:', e);
      return { scrollTop: 0, scrollHeight: 0, clientHeight: 0, maxScroll: 0 };
    }
  }

    scrollToTop() {
    try {
      let target = 0;
      
      if (this.settings.customScrollEnabled) {
        if (this.settings.scrollType === 'percentage') {
          const { scrollHeight, clientHeight } = this.getScrollInfo();
          const maxScroll = Math.max(scrollHeight - clientHeight, 1);
          target = (this.settings.topScrollPosition / 100) * maxScroll;
        } else {
          target = this.settings.topScrollPosition;
        }
      }
      
      const behavior = this.settings.smoothScrolling ? 'smooth' : 'auto';
      
      if (this.isWindowScrolling) {
        window.scrollTo({
          top: target,
          behavior: behavior
        });
      } else if (this.scrollContainer) {
        this.scrollContainer.scrollTo({
          top: target,
          behavior: behavior
        });
      }
    } catch (e) {
      console.error('ModernScrollButtons: Error scrolling to top:', e);
    }
  }

  scrollToBottom() {
    try {
      const { scrollHeight, clientHeight } = this.getScrollInfo();
      let target = scrollHeight - clientHeight;
      
      if (this.settings.customScrollEnabled) {
        if (this.settings.scrollType === 'percentage') {
          const maxScroll = Math.max(scrollHeight - clientHeight, 1);
          const percentagePosition = (this.settings.bottomScrollPosition / 100) * maxScroll;
          target = scrollHeight - clientHeight - percentagePosition;
        } else {
          target = Math.max(0, scrollHeight - this.settings.bottomScrollPosition);
        }
      }
      
      const behavior = this.settings.smoothScrolling ? 'smooth' : 'auto';
      
      if (this.isWindowScrolling) {
        window.scrollTo({
          top: target,
          behavior: behavior
        });
      } else if (this.scrollContainer) {
        this.scrollContainer.scrollTo({
          top: target,
          behavior: behavior
        });
      }
    } catch (e) {
      console.error('ModernScrollButtons: Error scrolling to bottom:', e);
    }
  }

  updateButtons = () => {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      if (!this.scrollTopBtn || !this.scrollBottomBtn) return;

      const { scrollTop, scrollHeight, clientHeight, maxScroll } = this.getScrollInfo();
      
      if (maxScroll <= 0) {
        // No scrollable content
        this.scrollTopBtn.classList.remove('show');
        this.scrollBottomBtn.classList.remove('show');
        return;
      }
      
      // Calculate scroll percentage
      const scrollPercentage = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      
      // Update progress indicator
      const circumference = 125.6; // 2 * π * r (r = 20)
      const offset = circumference - (scrollPercentage * circumference);
      
      const progressFills = document.querySelectorAll('.scroll-progress-fill');
      progressFills.forEach(circle => {
        circle.style.strokeDashoffset = offset;
      });
      
      // Show/hide top button
      if (scrollTop > 100) {
        this.scrollTopBtn.classList.add('show');
      } else {
        this.scrollTopBtn.classList.remove('show');
      }
      
      // Show/hide bottom button
      const distanceFromBottom = Math.max(0, scrollHeight - (scrollTop + clientHeight));
      if (distanceFromBottom > 50) {
        this.scrollBottomBtn.classList.add('show');
      } else {
        this.scrollBottomBtn.classList.remove('show');
      }
      
      // Update edge detection classes
      if (scrollTop < 10) {
        this.scrollTopBtn.classList.add('near-edge');
      } else {
        this.scrollTopBtn.classList.remove('near-edge');
      }
      
      if (distanceFromBottom < 10) {
        this.scrollBottomBtn.classList.add('near-edge');
      } else {
        this.scrollBottomBtn.classList.remove('near-edge');
      }
      
      this.lastScrollHeight = scrollHeight;
    });
  }

  setupEventListeners() {
    // Remove existing listeners first
    this.removeEventListeners();
    
    // Listen to scroll events on the correct container
    if (this.isWindowScrolling) {
      window.addEventListener('scroll', this.updateButtons, { passive: true });
      window.addEventListener('resize', this.updateButtons, { passive: true });
    } else if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.updateButtons, { passive: true });
      window.addEventListener('resize', this.updateButtons, { passive: true });
    }

    // Keyboard shortcuts
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDownBound);

    // Update button positions
    // this.updateButtonPositions();
  }

  removeEventListeners() {
    window.removeEventListener('scroll', this.updateButtons);
    window.removeEventListener('resize', this.updateButtons);
    document.removeEventListener('keydown', this.handleKeyDownBound);
    
    if (this.scrollContainer && !this.isWindowScrolling) {
      this.scrollContainer.removeEventListener('scroll', this.updateButtons);
    }
  }

  /*
  updateButtonPositions() {
    // Check for fixed elements that might overlap
    const fixedElements = document.querySelectorAll('*');
    let maxBottom = 20;
    
    for (const element of fixedElements) {
      const styles = window.getComputedStyle(element);
      if (styles.position === 'fixed' || styles.position === 'sticky') {
        const rect = element.getBoundingClientRect();
        if (rect.bottom === window.innerHeight && rect.height > 50) {
          maxBottom = Math.max(maxBottom, rect.height + 10);
        }
      }
    }
    
    if (this.scrollTopBtn) {
      this.scrollTopBtn.style.bottom = `${maxBottom + 65}px`;
    }
    if (this.scrollBottomBtn) {
      this.scrollBottomBtn.style.bottom = `${maxBottom}px`;
    }
  }
  */

    handleKeyDown(e) {
    // Check if shortcuts are enabled
    if (!this.settings.enableShortcuts) return;
    
    // Only handle if no input/textarea is focused
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) {
      return;
    }
    
    // Ctrl+Alt+Up/Down for scroll
    if (e.ctrlKey && e.altKey) {
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        this.scrollToTop();
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        this.scrollToBottom();
      }
    }
    
    // Ctrl+Home/End
    if (e.ctrlKey) {
      if (e.key === 'Home') {
        e.preventDefault();
        this.scrollToTop();
      } else if (e.key === 'End') {
        e.preventDefault();
        this.scrollToBottom();
      }
    }
  }

  setupMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver((mutations) => {
      // Check if scroll container might have changed
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldUpdate = true;
          break;
        }
      }
      
      if (shouldUpdate) {
        // Debounce the update
        clearTimeout(this.mutationTimeout);
        this.mutationTimeout = setTimeout(() => {
          this.validateScrollContainer();
          this.updateButtons();
        }, 300);
      }
    });

    // Observe the document for changes
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  validateScrollContainer() {
    let isValid = true;
    
    if (this.isWindowScrolling) {
      const windowScrollable = document.documentElement.scrollHeight > window.innerHeight;
      if (!windowScrollable) {
        // Try to find a div container
        isValid = false;
      }
    } else if (this.scrollContainer) {
      // Check if div is still scrollable and in DOM
      const inDOM = document.body.contains(this.scrollContainer);
      if (!inDOM || !this.isElementScrollable(this.scrollContainer)) {
        isValid = false;
      }
    }
    
    if (!isValid) {
      console.log('ModernScrollButtons: Re-detecting scroll container...');
      const oldContainer = this.scrollContainer;
      this.findScrollContainer();
      
      if (oldContainer !== this.scrollContainer) {
        this.setupEventListeners();
        this.updateButtons();
      }
    }
  }

  removeButtons() {
    if (this.scrollTopBtn && this.scrollTopBtn.parentNode) {
      this.scrollTopBtn.remove();
    }
    if (this.scrollBottomBtn && this.scrollBottomBtn.parentNode) {
      this.scrollBottomBtn.remove();
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.removeButtons();
    this.removeEventListeners();
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    clearTimeout(this.mutationTimeout);
  }
}

// Initialize extension
let scrollExtension = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

function initializeExtension() {
  initializationAttempts++;
  
  // Clean up previous instance if exists
  if (scrollExtension) {
    scrollExtension.destroy();
    scrollExtension = null;
  }
  
  // Wait a bit for dynamic content to load
  setTimeout(() => {
    try {
      scrollExtension = new ModernScrollButtons();
      initializationAttempts = 0; // Reset on success
      console.log('ModernScrollButtons: Extension initialized successfully');
    } catch (error) {
      console.error('ModernScrollButtons: Failed to initialize:', error);
      
      // Retry if not exceeded max attempts
      if (initializationAttempts < MAX_INIT_ATTEMPTS) {
        setTimeout(initializeExtension, 1000 * initializationAttempts);
      }
    }
  }, 300);
}

// Initialize based on page state
function safeInitialize() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    // If DOM is already loaded, wait a bit for dynamic content
    setTimeout(initializeExtension, 500);
  }
}

// Start the extension
safeInitialize();

// Handle SPA navigation
let lastUrl = location.href;
const spaObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('ModernScrollButtons: URL changed, reinitializing...');
    
    // Wait a bit for the new page to load
    setTimeout(initializeExtension, 800);
  }
});

spaObserver.observe(document, { subtree: true, childList: true });

// Watch for page visibility changes (for tabs)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && scrollExtension) {
    // Page became visible, update buttons
    setTimeout(() => {
      if (scrollExtension) {
        scrollExtension.updateButtons();
      }
    }, 100);
  }
});

// Export for debugging
if (typeof window !== 'undefined') {
  window.ModernScrollButtons = ModernScrollButtons;
}

// Add message listener at the end of content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateSettings' && scrollExtension) {
    scrollExtension.updateSettings(request.settings);
  }
  sendResponse({ success: true });
});