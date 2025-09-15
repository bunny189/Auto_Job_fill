// BACKGROUND.JS - Enhanced Service Worker

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open profile setup on first install
    chrome.tabs.create({
      url: chrome.runtime.getURL('profile.html')
    });
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'fill-form') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs && tabs[0] && tabs[0].id;
      if (!tabId) return;
      
      handleFillFormCommand(tabId);
    });
  }
});

// Enhanced message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'fillForm') {
    handleFillFormFromPopup(request, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'scanForm') {
    handleScanFormFromPopup(request, sendResponse);
    return true; // Keep message channel open for async response
  }
});

// Handle fill form command from keyboard shortcut
async function handleFillFormCommand(tabId) {
  try {
    // Get user profile
    const data = await chrome.storage.local.get(['userProfile']);
    
    if (!data.userProfile) {
      console.log('No profile found for keyboard shortcut');
      return;
    }

    // Try to ensure content script and send message
    await ensureContentScriptAndSend(tabId, {
      action: 'fillForm',
      profile: data.userProfile
    });
  } catch (error) {
    console.error('Keyboard shortcut fill error:', error);
  }
}

// Handle fill form from popup
async function handleFillFormFromPopup(request, sendResponse) {
  try {
    const tabId = request.tabId;
    const profile = request.profile;
    
    if (!tabId || !profile) {
      sendResponse({ 
        success: false, 
        error: 'Missing tab ID or profile data' 
      });
      return;
    }

    console.log('Handling fill form for tab:', tabId);
    
    // Ensure content script is loaded and send message
    const response = await ensureContentScriptAndSend(tabId, {
      action: 'fillForm',
      profile: profile
    });

    console.log('Fill form response:', response);
    sendResponse(response);

  } catch (error) {
    console.error('Fill form error:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Handle scan form from popup
async function handleScanFormFromPopup(request, sendResponse) {
  try {
    const tabId = request.tabId;
    
    if (!tabId) {
      sendResponse({ 
        success: false, 
        error: 'Missing tab ID' 
      });
      return;
    }

    console.log('Handling scan form for tab:', tabId);
    
    // Ensure content script is loaded and send message
    const response = await ensureContentScriptAndSend(tabId, {
      action: 'scanForm'
    });

    console.log('Scan form response:', response);
    sendResponse(response);

  } catch (error) {
    console.error('Scan form error:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Enhanced function to ensure content script is loaded and send message
async function ensureContentScriptAndSend(tabId, message, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Trying to send message to tab ${tabId}`);
      
      // First, try to ping the content script
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      console.log('Content script is already loaded');
      
      // Content script exists, send the actual message
      const response = await chrome.tabs.sendMessage(tabId, message);
      console.log('Message sent successfully:', response);
      return response || { success: true, result: 'Message sent' };
      
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (error.message.includes('Could not establish connection')) {
        try {
          console.log('Injecting content script...');
          
          // Inject the content script
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });
          
          console.log('Content script injected, waiting for initialization...');
          
          // Wait for content script to initialize
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Verify content script is ready
          for (let i = 0; i < 5; i++) {
            try {
              await chrome.tabs.sendMessage(tabId, { action: 'ping' });
              console.log('Content script is ready');
              break;
            } catch (e) {
              if (i === 4) throw e;
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          // Send the actual message
          console.log('Sending message to newly injected content script...');
          const response = await chrome.tabs.sendMessage(tabId, message);
          console.log('Message sent to injected script:', response);
          return response || { success: true, result: 'Message sent after injection' };
          
        } catch (injectionError) {
          console.error('Content script injection failed:', injectionError);
          
          if (attempt === maxAttempts) {
            if (injectionError.message.includes('Cannot access contents')) {
              throw new Error('Cannot access this page. Extension permissions may be blocked or this is a restricted page.');
            } else if (injectionError.message.includes('Tabs cannot be edited')) {
              throw new Error('Cannot modify this tab. Try refreshing the page or using a different tab.');
            } else {
              throw new Error('Failed to connect to the page. Please refresh and try again.');
            }
          }
          
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        // Different type of error, don't retry
        throw error;
      }
    }
  }
  
  throw new Error('Failed to establish connection after multiple attempts');
}

// Helper function to check if tab is accessible
async function isTabAccessible(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    // Check if it's a restricted URL
    const restrictedPrefixes = [
      'chrome://', 'chrome-extension://', 'moz-extension://', 'edge://',
      'about:', 'file://', 'data:', 'javascript:'
    ];
    
    if (restrictedPrefixes.some(prefix => tab.url.startsWith(prefix))) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking tab accessibility:', error);
    return false;
  }
}

// Clean up on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Smart Job AutoFill extension started');
});

// Handle extension suspend/resume
chrome.runtime.onSuspend.addListener(() => {
  console.log('Smart Job AutoFill extension suspending');
});

// Add error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});