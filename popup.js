// POPUP.JS - Robust Connection Handling

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const setupProfileBtn = document.getElementById('setupProfile');
    const fillFormBtn = document.getElementById('fillForm');
    const scanFormBtn = document.getElementById('scanForm');
    const exportDataBtn = document.getElementById('exportData');
    const importDataBtn = document.getElementById('importData');
    const fileInput = document.getElementById('fileInput');
    const statusDiv = document.getElementById('status');
    const profileStatusDiv = document.getElementById('profileStatus');
    const statsDiv = document.getElementById('stats');
    const statsText = document.getElementById('statsText');

    // Initialize
    checkProfileStatus();
    loadLastFillStats();

    // Event Listeners
    setupProfileBtn.addEventListener('click', function() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('profile.html')
        });
        window.close();
    });

    fillFormBtn.addEventListener('click', async function() {
        fillFormBtn.textContent = '⏳ Connecting...';
        fillFormBtn.disabled = true;
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Check if it's a restricted page
            if (isRestrictedPage(tab.url)) {
                showStatus('❌ Cannot autofill on this page type\n\nTry on job sites like:\n• Indeed.com\n• LinkedIn.com\n• Company career pages', 'error');
                return;
            }

            // Get profile data first
            const data = await chrome.storage.local.get(['userProfile']);
            if (!data.userProfile) {
                showStatus('❌ Profile not found\n\nClick "⚙️ Setup Profile" first', 'error');
                return;
            }

            fillFormBtn.textContent = '⏳ Preparing...';

            // Use background script to handle the communication
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'fillForm',
                    tabId: tab.id,
                    profile: data.userProfile
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            if (result?.success) {
                showStatus('🎉 SUCCESS!\n\n' + (result.result || 'Form filled successfully'), 'success');
                saveLastFillStats(result.result);
                loadLastFillStats();
            } else {
                showStatus('❌ Fill failed\n\n' + (result?.error || 'Unknown error occurred'), 'error');
            }

        } catch (error) {
            console.error('Fill error:', error);
            handleFillError(error);
        } finally {
            fillFormBtn.textContent = '🚀 Fill Current Form';
            fillFormBtn.disabled = false;
        }
    });

    scanFormBtn.addEventListener('click', async function() {
        scanFormBtn.textContent = '🔍 Scanning...';
        scanFormBtn.disabled = true;
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (isRestrictedPage(tab.url)) {
                showStatus('❌ Cannot scan this page type', 'error');
                return;
            }

            // Use background script for scanning too
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'scanForm',
                    tabId: tab.id
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            if (result?.success) {
                const fields = result.fields || [];
                const summary = result.summary || {};
                
                if (fields.length > 0) {
                    let message = `📊 SCAN RESULTS\n\n`;
                    message += `Found: ${summary.total || fields.length} fields\n`;
                    message += `Recognized: ${summary.recognized || 0}\n`;
                    message += `Unknown: ${summary.unknown || 0}\n\n`;
                    
                    const recognizedTypes = [...new Set(fields.filter(f => f.type !== 'unknown').map(f => f.type))];
                    if (recognizedTypes.length > 0) {
                        message += `Types detected:\n${recognizedTypes.join(', ')}`;
                    }
                    
                    showStatus(message, 'success');
                    console.log('📊 Scan results:', { fields, summary });
                } else {
                    showStatus('❌ No form fields found\n\nThis page may not have a job application form', 'error');
                }
            } else {
                showStatus('❌ Scan failed\n\n' + (result?.error || 'Could not analyze page'), 'error');
            }

        } catch (error) {
            console.error('Scan error:', error);
            showStatus('❌ Scan error\n\n' + error.message, 'error');
        } finally {
            scanFormBtn.textContent = '🔍 Scan Form Fields';
            scanFormBtn.disabled = false;
        }
    });

    exportDataBtn.addEventListener('click', async function() {
        try {
            const data = await chrome.storage.local.get(['userProfile']);
            if (data.userProfile) {
                const blob = new Blob([JSON.stringify(data.userProfile, null, 2)], {
                    type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `job_autofill_profile_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showStatus('📁 Profile exported successfully!', 'success');
            } else {
                showStatus('❌ No profile to export\n\nCreate a profile first', 'error');
            }
        } catch (error) {
            showStatus('❌ Export error\n\n' + error.message, 'error');
        }
    });

    importDataBtn.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const profileData = JSON.parse(e.target.result);
                    
                    // Basic validation
                    if (!profileData || typeof profileData !== 'object') {
                        throw new Error('Invalid file format');
                    }
                    
                    if (!profileData.personalInfo) {
                        throw new Error('Missing personal information section');
                    }
                    
                    await chrome.storage.local.set({ userProfile: profileData });
                    showStatus('✅ Profile imported successfully!', 'success');
                    checkProfileStatus();
                } catch (error) {
                    if (error instanceof SyntaxError) {
                        showStatus('❌ Invalid JSON file\n\nPlease select a valid profile file', 'error');
                    } else {
                        showStatus('❌ Import error\n\n' + error.message, 'error');
                    }
                }
            };
            reader.readAsText(file);
            fileInput.value = ''; // Reset input
        }
    });

    // Helper Functions
    function isRestrictedPage(url) {
        if (!url) return true;
        
        const restrictedPrefixes = [
            'chrome://', 'chrome-extension://', 'moz-extension://', 'edge://',
            'about:', 'file://', 'data:', 'javascript:', 'chrome-search://'
        ];
        
        return restrictedPrefixes.some(prefix => url.startsWith(prefix));
    }

    function handleFillError(error) {
        let message = '❌ FILL ERROR\n\n';
        
        if (error.message.includes('Could not establish connection')) {
            message += 'Cannot connect to page\n\n';
            message += 'Try:\n';
            message += '1. Refresh the page\n';
            message += '2. Wait for page to load completely\n';
            message += '3. Try again';
        } else if (error.message.includes('Cannot access contents')) {
            message += 'Page access denied\n\n';
            message += 'This page blocks extensions.\n';
            message += 'Try a different job site.';
        } else if (error.message.includes('Tabs cannot be edited')) {
            message += 'Cannot modify this tab\n\n';
            message += 'Try on a regular website.';
        } else if (error.message.includes('activeTab')) {
            message += 'Permission required\n\n';
            message += 'Please try again or reload the extension.';
        } else {
            message += error.message;
            message += '\n\nIf this persists, try:\n';
            message += '• Refreshing the page\n';
            message += '• Reloading the extension';
        }
        
        showStatus(message, 'error');
    }

    async function checkProfileStatus() {
        try {
            const data = await chrome.storage.local.get(['userProfile']);
            if (data.userProfile && data.userProfile.personalInfo) {
                const name = data.userProfile.personalInfo.firstName || 'User';
                const email = data.userProfile.personalInfo.email;
                
                profileStatusDiv.textContent = `✅ Profile ready for ${name}`;
                profileStatusDiv.className = 'profile-status configured';
                fillFormBtn.disabled = false;
                
                // Show email in smaller text if available
                if (email) {
                    profileStatusDiv.textContent += ` (${email})`;
                }
            } else {
                profileStatusDiv.textContent = '⚠️ No profile configured';
                profileStatusDiv.className = 'profile-status';
                fillFormBtn.disabled = true;
            }
        } catch (error) {
            profileStatusDiv.textContent = '❌ Profile check failed';
            profileStatusDiv.className = 'profile-status error';
            fillFormBtn.disabled = true;
            console.error('Profile check error:', error);
        }
    }

    function showStatus(message, type) {
        if (!statusDiv) return;
        
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';
        
        // Auto-hide after delay (longer for errors)
        const delay = type === 'error' ? 8000 : 4000;
        setTimeout(() => {
            if (statusDiv) {
                statusDiv.style.display = 'none';
            }
        }, delay);
    }

    async function saveLastFillStats(result) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const stats = {
                timestamp: new Date().toISOString(),
                result: result || 'Fill completed',
                url: tab?.url || 'Unknown'
            };
            
            await chrome.storage.local.set({ lastFillStats: stats });
        } catch (error) {
            console.log('Stats save error:', error);
        }
    }

    async function loadLastFillStats() {
        try {
            const data = await chrome.storage.local.get(['lastFillStats']);
            if (data.lastFillStats && statsDiv && statsText) {
                const stats = data.lastFillStats;
                const date = new Date(stats.timestamp).toLocaleString();
                let domain = 'Unknown site';
                
                try {
                    if (stats.url && stats.url.startsWith('http')) {
                        domain = new URL(stats.url).hostname.replace('www.', '');
                    }
                } catch (e) {
                    domain = 'Unknown site';
                }
                
                statsText.textContent = `Last: ${stats.result} on ${domain}`;
                statsDiv.classList.add('show');
            }
        } catch (error) {
            console.log('Stats load error:', error);
        }
    }

    // Keyboard shortcut hint
    try {
        chrome.commands.getAll((commands) => {
            const fillCommand = commands.find(cmd => cmd.name === 'fill-form');
            if (fillCommand?.shortcut) {
                const shortcutElement = document.querySelector('.shortcut');
                if (shortcutElement) {
                    shortcutElement.textContent = `⌨️ Shortcut: ${fillCommand.shortcut}`;
                }
            }
        });
    } catch (error) {
        console.log('Shortcut info error:', error);
    }

    // Add some visual feedback on button hover
    [fillFormBtn, scanFormBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('mouseenter', function() {
                if (!this.disabled) {
                    this.style.transform = 'translateY(-1px)';
                }
            });
            
            btn.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        }
    });
});