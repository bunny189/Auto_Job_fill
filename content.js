// CONTENT.JS - Enhanced Field Detection with Better Email/Name Handling

(function() {
    'use strict';

    // Enhanced field patterns with priority scoring
    const FIELD_PATTERNS = {
        email: {
            patterns: [
                'email', 'e-mail', 'email address', 'mail', 'electronic mail',
                'email_address', 'contact_email', 'work_email', 'personal_email',
                'e_mail', 'emailaddress', 'mail_address', 'user.email'
            ],
            priority: 100
        },
        firstName: {
            patterns: [
                'first name', 'firstname', 'fname', 'given name', 'forename',
                'first_name', 'givenname', 'name_first', 'applicant_first_name',
                'candidate_first_name', 'first', 'given',
                'name-first', 'name.first', 'personal.firstName', 'user.firstName'
            ],
            priority: 90
        },
        lastName: {
            patterns: [
                'last name', 'lastname', 'lname', 'surname', 'family name',
                'last_name', 'familyname', 'name_last', 'applicant_last_name',
                'candidate_last_name', 'last', 'family', 'sur name',
                'name-last', 'name.last', 'personal.lastName', 'user.lastName'
            ],
            priority: 90
        },
        fullName: {
            patterns: [
                'full name', 'name', 'candidate name', 'applicant name', 'your name',
                'fullname', 'complete name', 'legal name', 'display name', 'user name',
                'full-name', 'full_name', 'applicant_name', 'candidate_name'
            ],
            priority: 70 // Lower priority than first/last name
        },
        phone: {
            patterns: [
                'phone', 'telephone', 'mobile', 'cell', 'contact number',
                'phone number', 'tel', 'mobile number', 'cell phone', 'contact_phone',
                'home phone', 'work phone', 'phone_number', 'telephone_number'
            ],
            priority: 80
        },
        address: {
            patterns: [
                'address', 'street address', 'home address', 'mailing address',
                'street', 'address line', 'residential address', 'current address',
                'address line 1', 'addr', 'street_address', 'address1', 'address_1'
            ],
            priority: 70
        },
        city: {
            patterns: ['city', 'town', 'locality', 'municipality', 'urban area'],
            priority: 70
        },
        state: {
            patterns: ['state', 'province', 'region', 'territory', 'county', 'prefecture'],
            priority: 70
        },
        zipCode: {
            patterns: [
                'zip', 'zip code', 'postal code', 'postcode', 'postal', 'pin code',
                'zipcode', 'zip_code', 'postal_code', 'post_code'
            ],
            priority: 70
        },
        country: {
            patterns: ['country', 'nation', 'nationality', 'country of residence'],
            priority: 70
        },
        location: {
            patterns: [
                'location', 'current location', 'preferred location', 'work location',
                'job location', 'where are you located', 'your location', 'based in',
                'residence', 'current city', 'current residence'
            ],
            priority: 60
        }
    };

    // State management
    let shadowHost = null;
    let shadowRoot = null;
    let ui = {};
    let isDebugMode = false;

    // Enhanced job page detection
    function isJobPage() {
        const url = location.href.toLowerCase();
        const title = document.title.toLowerCase();
        
        const jobKeywords = [
            'apply', 'application', 'job', 'career', 'resume', 'position', 'hiring',
            'employment', 'work', 'vacancy', 'recruit', 'candidate', 'analyst'
        ];
        
        // Check URL and title
        if (jobKeywords.some(k => url.includes(k) || title.includes(k))) return true;
        
        // Check for job form fields
        const jobFormSelectors = [
            'input[name*="first" i]', 'input[name*="last" i]', 'input[name*="name" i]',
            'input[type="email"]', 'textarea[name*="cover" i]', 'input[name*="phone" i]'
        ];
        
        const foundSelectors = jobFormSelectors.filter(sel => document.querySelector(sel)).length;
        return foundSelectors >= 2;
    }

    // Create floating UI
    function createFloatingUI() {
        if (shadowHost) return;

        shadowHost = document.createElement('div');
        shadowHost.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 0 !important;
            height: 0 !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
        `;
        
        document.documentElement.appendChild(shadowHost);
        shadowRoot = shadowHost.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            .autofill-btn {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 25px;
                padding: 12px 20px;
                font: bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 2147483647;
                pointer-events: auto;
                transition: all 0.3s ease;
                user-select: none;
                min-width: 120px;
                text-align: center;
            }
            .autofill-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }
            .autofill-btn.loading {
                background: #f39c12;
                cursor: not-allowed;
            }
            .autofill-btn.success {
                background: #27ae60;
            }
            .debug-btn {
                position: fixed;
                top: 70px;
                right: 20px;
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 8px 16px;
                font: bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                cursor: pointer;
                z-index: 2147483647;
                pointer-events: auto;
                transition: all 0.3s ease;
            }
            .toast {
                position: fixed;
                top: 120px;
                right: 20px;
                background: #27ae60;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 2147483647;
                pointer-events: none;
                opacity: 0;
                transform: translateX(300px);
                transition: all 0.3s ease;
                max-width: 350px;
                white-space: pre-line;
            }
            .toast.show {
                opacity: 1;
                transform: translateX(0);
            }
            .toast.error {
                background: #e74c3c;
            }
            .toast.warning {
                background: #f39c12;
            }
        `;

        shadowRoot.appendChild(style);

        // Create main button
        ui.button = document.createElement('button');
        ui.button.className = 'autofill-btn';
        ui.button.textContent = '🚀 AutoFill';
        ui.button.addEventListener('click', handleAutofill);

        // Create debug button
        ui.debugButton = document.createElement('button');
        ui.debugButton.className = 'debug-btn';
        ui.debugButton.textContent = '🔍 Debug';
        ui.debugButton.addEventListener('click', toggleDebugMode);

        // Create toast
        ui.toast = document.createElement('div');
        ui.toast.className = 'toast';

        shadowRoot.appendChild(ui.button);
        shadowRoot.appendChild(ui.debugButton);
        shadowRoot.appendChild(ui.toast);
    }

    // Enhanced field discovery
    function findAllFormFields() {
        const fields = new Set();
        
        // Standard selectors
        const selectors = [
            'input[type="text"]', 'input[type="email"]', 'input[type="tel"]',
            'input[type="url"]', 'input[type="search"]', 'input:not([type])',
            'textarea', 'select', '[role="textbox"]', '[contenteditable="true"]'
        ];
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(field => {
                if (isFieldVisible(field) && !isFieldDisabled(field)) {
                    fields.add(field);
                }
            });
        });

        return Array.from(fields);
    }

    // Enhanced field visibility check
    function isFieldVisible(field) {
        if (!field) return false;
        
        try {
            const style = window.getComputedStyle(field);
            const rect = field.getBoundingClientRect();
            
            // Check if element is visible
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
            
            // Check if element has dimensions
            if (rect.width === 0 && rect.height === 0) {
                return false;
            }
            
            return true;
        } catch (e) {
            return false;
        }
    }

    // Check if field is disabled
    function isFieldDisabled(field) {
        return field.disabled || field.readOnly || 
               field.type === 'hidden' || field.type === 'submit' || field.type === 'button';
    }

    // Enhanced text association
    function findAssociatedText(field) {
        const texts = [];
        
        try {
            // Method 1: Label with 'for' attribute (highest priority)
            if (field.id) {
                const label = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
                if (label) {
                    texts.push({
                        text: cleanText(label.textContent),
                        confidence: 1.0,
                        method: 'label[for]'
                    });
                }
            }
            
            // Method 2: Parent label (high priority)
            const parentLabel = field.closest('label');
            if (parentLabel) {
                texts.push({
                    text: cleanText(parentLabel.textContent),
                    confidence: 0.9,
                    method: 'parent_label'
                });
            }
            
            // Method 3: Previous siblings
            let sibling = field.previousElementSibling;
            let count = 0;
            while (sibling && count < 3) {
                if (sibling.tagName && ['LABEL', 'SPAN', 'DIV', 'P'].includes(sibling.tagName)) {
                    const text = cleanText(sibling.textContent);
                    if (text && text.length < 100 && text.length > 1) {
                        texts.push({
                            text: text,
                            confidence: 0.7 - (count * 0.1),
                            method: `prev_${sibling.tagName.toLowerCase()}`
                        });
                    }
                }
                sibling = sibling.previousElementSibling;
                count++;
            }
            
            // Method 4: ARIA labels (high priority)
            if (field.getAttribute('aria-label')) {
                texts.push({
                    text: cleanText(field.getAttribute('aria-label')),
                    confidence: 0.9,
                    method: 'aria-label'
                });
            }
            
            // Method 5: Placeholder (medium priority)
            if (field.placeholder) {
                texts.push({
                    text: cleanText(field.placeholder),
                    confidence: 0.6,
                    method: 'placeholder'
                });
            }
            
            // Method 6: Field attributes (lower priority)
            ['name', 'id', 'title'].forEach(attr => {
                const value = field.getAttribute(attr);
                if (value) {
                    texts.push({
                        text: cleanText(value.replace(/[_-]/g, ' ')),
                        confidence: 0.5,
                        method: `attribute_${attr}`
                    });
                }
            });
            
        } catch (e) {
            console.error('Error finding associated text:', e);
        }
        
        // Remove duplicates and sort by confidence
        const uniqueTexts = texts.filter((text, index, self) => 
            self.findIndex(t => t.text === text.text) === index
        );
        
        return uniqueTexts.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    }

    function cleanText(text) {
        if (!text) return '';
        return text
            .replace(/[*:•]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    // Enhanced field type detection with strict email detection
    function detectFieldType(field, associatedTexts) {
        // FIRST: Check HTML input type (highest priority)
        if (field.type === 'email') {
            return 'email';
        }
        if (field.type === 'tel') {
            return 'phone';
        }
        
        // Get all text identifiers
        const allTexts = [
            field.name || '',
            field.id || '',
            field.placeholder || '',
            field.className || '',
            ...associatedTexts.map(t => t.text)
        ];
        
        const identifier = allTexts.join(' ').toLowerCase();
        
        // SECOND: Strict email detection (prevent false positives)
        const emailKeywords = ['email', 'e-mail', 'mail', '@'];
        const nameKeywords = ['name', 'first', 'last', 'full'];
        
        const hasEmailKeyword = emailKeywords.some(keyword => identifier.includes(keyword));
        const hasNameKeyword = nameKeywords.some(keyword => identifier.includes(keyword));
        
        // If it has email keywords but no name keywords, it's likely email
        if (hasEmailKeyword && !hasNameKeyword) {
            return 'email';
        }
        
        // If it has both email and name keywords, check which is more prominent
        if (hasEmailKeyword && hasNameKeyword) {
            const emailScore = emailKeywords.filter(k => identifier.includes(k)).length;
            const nameScore = nameKeywords.filter(k => identifier.includes(k)).length;
            
            if (emailScore > nameScore) {
                return 'email';
            }
        }
        
        // THIRD: Pattern matching with priority scoring
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [fieldType, config] of Object.entries(FIELD_PATTERNS)) {
            let score = 0;
            
            for (const pattern of config.patterns) {
                if (identifier.includes(pattern)) {
                    // Exact match gets full priority
                    score = config.priority;
                    break;
                } else {
                    // Partial match gets reduced score
                    const words = pattern.split(' ');
                    const matchingWords = words.filter(word => identifier.includes(word));
                    if (matchingWords.length > 0) {
                        score = Math.max(score, (matchingWords.length / words.length) * config.priority);
                    }
                }
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = fieldType;
            }
        }
        
        // Require minimum confidence threshold
        return bestScore >= 30 ? bestMatch : 'unknown';
    }

    // Debug functions
    function toggleDebugMode() {
        isDebugMode = !isDebugMode;
        if (isDebugMode) {
            runDebugAnalysis();
        } else {
            clearDebugHighlights();
        }
    }

    function runDebugAnalysis() {
        const fields = findAllFormFields();
        let debugInfo = `🔍 FIELD ANALYSIS REPORT\n`;
        debugInfo += `═══════════════════════════════════\n`;
        debugInfo += `Found ${fields.length} total fields\n\n`;
        
        fields.forEach((field, index) => {
            const associatedTexts = findAssociatedText(field);
            const detectedType = detectFieldType(field, associatedTexts);
            
            debugInfo += `${index + 1}. ${field.tagName}[${field.type || 'text'}]\n`;
            debugInfo += `   🎯 Detected: ${detectedType}\n`;
            debugInfo += `   🏷️  Name: ${field.name || 'none'}\n`;
            debugInfo += `   🆔 ID: ${field.id || 'none'}\n`;
            debugInfo += `   📝 Placeholder: ${field.placeholder || 'none'}\n`;
            debugInfo += `   📋 Associated texts:\n`;
            
            associatedTexts.slice(0, 3).forEach(textInfo => {
                debugInfo += `      • "${textInfo.text}" (${textInfo.method}, confidence: ${textInfo.confidence.toFixed(1)})\n`;
            });
            
            debugInfo += `\n`;
            
            // Highlight field
            highlightFieldForDebug(field, detectedType);
        });
        
        console.log(debugInfo);
        
        const summary = `Debug Mode: ${fields.length} fields analyzed\nCheck console for full details`;
        showToast(summary, 'warning');
    }

    function highlightFieldForDebug(field, type) {
        try {
            field.style.border = '3px solid #ff6b6b';
            field.style.backgroundColor = '#fff5f5';
            
            const rect = field.getBoundingClientRect();
            const label = document.createElement('div');
            label.textContent = type;
            label.style.cssText = `
                position: absolute;
                background: #ff6b6b;
                color: white;
                padding: 4px 8px;
                font-size: 12px;
                font-weight: bold;
                border-radius: 4px;
                z-index: 1000000;
                pointer-events: none;
                left: ${rect.left + window.scrollX}px;
                top: ${rect.top + window.scrollY - 25}px;
                font-family: monospace;
            `;
            
            document.body.appendChild(label);
            
            setTimeout(() => {
                field.style.border = '';
                field.style.backgroundColor = '';
                if (label.parentNode) {
                    label.parentNode.removeChild(label);
                }
            }, 15000); // Show for 15 seconds
        } catch (e) {
            console.error('Error highlighting field:', e);
        }
    }

    function clearDebugHighlights() {
        try {
            document.querySelectorAll('div').forEach(el => {
                if (el.style.background === 'rgb(255, 107, 107)') {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }
            });
        } catch (e) {
            console.error('Error clearing highlights:', e);
        }
    }

    // Show toast messages
    function showToast(message, type = 'success') {
        if (!ui.toast) return;
        
        ui.toast.textContent = message;
        ui.toast.className = `toast ${type}`;
        ui.toast.classList.add('show');
        
        setTimeout(() => {
            ui.toast.classList.remove('show');
        }, type === 'warning' ? 10000 : 4000);
    }

    // Set button state
    function setButtonState(state, text) {
        if (!ui.button) return;
        
        ui.button.className = `autofill-btn ${state}`;
        ui.button.textContent = text;
    }

    // Get value for field type from profile - FIXED EMAIL ISSUE
    function getValueForFieldType(fieldType, profile) {
        if (!profile) return null;
        
        const valueMap = {
            firstName: profile.personalInfo?.firstName,
            lastName: profile.personalInfo?.lastName,
            fullName: profile.personalInfo?.fullName || 
                     (profile.personalInfo?.firstName && profile.personalInfo?.lastName ? 
                      `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}` : null),
            email: profile.personalInfo?.email, // This should be the actual email address
            phone: profile.personalInfo?.phone,
            address: profile.personalInfo?.address,
            city: profile.personalInfo?.city,
            state: profile.personalInfo?.state,
            zipCode: profile.personalInfo?.zipCode,
            country: profile.personalInfo?.country,
            location: profile.personalInfo?.location || 
                     (profile.personalInfo?.city && profile.personalInfo?.state ? 
                      `${profile.personalInfo.city}, ${profile.personalInfo.state}` : null)
        };

        return valueMap[fieldType] || null;
    }

    // Enhanced field filling
    function fillField(field, value, fieldType) {
        try {
            field.focus({ preventScroll: true });
            
            if (field.tagName === 'SELECT') {
                return fillSelectField(field, value);
            } else if (field.type === 'checkbox') {
                field.checked = value === true || value === 'true' || value === '1';
                triggerEvents(field);
                return true;
            } else if (field.type === 'radio') {
                if (field.value.toLowerCase() === value.toLowerCase()) {
                    field.checked = true;
                    triggerEvents(field);
                    return true;
                }
                return false;
            } else if (field.isContentEditable || field.getAttribute('contenteditable') === 'true') {
                field.textContent = value;
                field.innerHTML = value;
                triggerEvents(field);
                return true;
            } else {
                return fillTextField(field, value);
            }
        } catch (e) {
            console.error('Error filling field:', e);
            return false;
        }
    }

    // Text field filling with React support
    function fillTextField(field, value) {
        try {
            // Clear existing value first
            field.value = '';
            
            // Use native setter for React compatibility
            const setter = Object.getOwnPropertyDescriptor(
                field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 
                'value'
            )?.set;
            
            if (setter) {
                setter.call(field, value);
            } else {
                field.value = value;
            }
            
            triggerEvents(field);
            
            // Verify the value was set
            return field.value === value;
        } catch (e) {
            console.error('Error filling text field:', e);
            return false;
        }
    }

    // Select field filling
    function fillSelectField(field, value) {
        try {
            const options = Array.from(field.options);
            
            // Try exact matches
            let option = options.find(opt => opt.value === value) ||
                        options.find(opt => opt.textContent.trim() === value);
            
            // Try case-insensitive matches
            if (!option) {
                const lowerValue = value.toLowerCase();
                option = options.find(opt => 
                    opt.value.toLowerCase() === lowerValue ||
                    opt.textContent.trim().toLowerCase() === lowerValue
                );
            }
            
            if (option) {
                field.value = option.value;
                field.selectedIndex = option.index;
                triggerEvents(field);
                return true;
            }
            
            return false;
        } catch (e) {
            console.error('Error filling select field:', e);
            return false;
        }
    }

    // Trigger events for form frameworks
    function triggerEvents(field) {
        const events = ['input', 'change', 'blur', 'keyup'];
        
        events.forEach(eventName => {
            try {
                const event = new Event(eventName, { 
                    bubbles: true, 
                    cancelable: true
                });
                field.dispatchEvent(event);
            } catch (e) {
                try {
                    const event = document.createEvent('Event');
                    event.initEvent(eventName, true, true);
                    field.dispatchEvent(event);
                } catch (e2) {
                    // Ignore if we can't trigger events
                }
            }
        });
    }

    // Field highlighting
    function highlightField(field, fieldType) {
        try {
            const original = {
                border: field.style.border,
                boxShadow: field.style.boxShadow,
                backgroundColor: field.style.backgroundColor
            };

            field.style.border = '2px solid #27ae60';
            field.style.boxShadow = '0 0 8px rgba(39, 174, 96, 0.5)';
            field.style.backgroundColor = '#e8f5e8';

            // Add field type label
            const rect = field.getBoundingClientRect();
            const label = document.createElement('div');
            label.textContent = fieldType;
            label.style.cssText = `
                position: absolute;
                background: #27ae60;
                color: white;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: bold;
                border-radius: 4px;
                z-index: 1000000;
                pointer-events: none;
                left: ${rect.left + window.scrollX}px;
                top: ${rect.top + window.scrollY - 22}px;
                font-family: monospace;
            `;
            
            document.body.appendChild(label);

            setTimeout(() => {
                field.style.border = original.border;
                field.style.boxShadow = original.boxShadow;
                field.style.backgroundColor = original.backgroundColor;
                
                if (label.parentNode) {
                    label.parentNode.removeChild(label);
                }
            }, 4000);
        } catch (e) {
            console.error('Error highlighting field:', e);
        }
    }

    // Main autofill function with profile parameter
    async function handleAutofillWithProfile(profile, sendResponse) {
        setButtonState('loading', '⏳ Working...');
        
        try {
            if (!profile) {
                showToast('❌ No profile data provided!', 'warning');
                setButtonState('', '🚀 AutoFill');
                sendResponse({ success: false, error: 'No profile data provided' });
                return;
            }

            const allFields = findAllFormFields();
            
            if (allFields.length === 0) {
                showToast('❌ No form fields detected!\nTry Debug mode to analyze the page', 'warning');
                setButtonState('', '🚀 AutoFill');
                sendResponse({ success: false, error: 'No form fields detected' });
                return;
            }
            
            // Analyze and fill fields
            const analyzedFields = allFields.map(field => {
                const associatedTexts = findAssociatedText(field);
                const detectedType = detectFieldType(field, associatedTexts);
                return { element: field, type: detectedType, texts: associatedTexts };
            });
            
            const fillableFields = analyzedFields.filter(field => field.type !== 'unknown');
            
            let filledCount = 0;
            let attemptedCount = 0;
            const results = [];

            console.log('🚀 Starting autofill process...');
            console.log('Profile data:', profile);
            console.log('Fillable fields:', fillableFields.map(f => ({ type: f.type, element: f.element.tagName })));

            for (const fieldInfo of fillableFields) {
                const value = getValueForFieldType(fieldInfo.type, profile);
                
                console.log(`Trying to fill ${fieldInfo.type} with value:`, value);
                
                if (value && value.toString().trim()) {
                    attemptedCount++;
                    
                    // Small delay between fills
                    await new Promise(resolve => setTimeout(resolve, 150));
                    
                    const success = fillField(fieldInfo.element, value, fieldInfo.type);
                    if (success) {
                        highlightField(fieldInfo.element, fieldInfo.type);
                        filledCount++;
                        results.push(`✅ ${fieldInfo.type}: "${value}"`);
                        console.log(`✅ Successfully filled ${fieldInfo.type} with "${value}"`);
                    } else {
                        results.push(`❌ ${fieldInfo.type}: failed`);
                        console.log(`❌ Failed to fill ${fieldInfo.type}`);
                    }
                } else {
                    console.log(`⚠️ No value available for ${fieldInfo.type}`);
                }
            }

            // Show comprehensive results
            let message = '';
            if (filledCount > 0) {
                message = `🎉 SUCCESS!\n`;
                message += `Filled ${filledCount}/${attemptedCount} fields\n\n`;
                message += `📊 Stats:\n`;
                message += `• Found: ${allFields.length} total fields\n`;
                message += `• Recognized: ${fillableFields.length} fields\n`;
                message += `• Filled: ${filledCount} fields\n\n`;
                message += `📝 Results:\n`;
                message += results.slice(0, 10).join('\n');
                if (results.length > 10) {
                    message += `\n... and ${results.length - 10} more`;
                }
            } else {
                message = `❌ No fields were filled\n\n`;
                message += `📊 Analysis:\n`;
                message += `• Found: ${allFields.length} total fields\n`;
                message += `• Recognized: ${fillableFields.length} fields\n`;
                message += `• Attempted: ${attemptedCount} fields\n\n`;
                message += `💡 Try Debug mode to see field analysis`;
            }

            showToast(message, filledCount > 0 ? 'success' : 'warning');
            setButtonState(filledCount > 0 ? 'success' : '', '🚀 AutoFill');

            // Send response back to popup
            sendResponse({ 
                success: true, 
                result: `${filledCount}/${attemptedCount} fields filled`,
                filledCount: filledCount,
                attemptedCount: attemptedCount,
                totalFields: allFields.length,
                recognizedFields: fillableFields.length
            });

        } catch (error) {
            console.error('Autofill error:', error);
            showToast(`❌ Error: ${error.message}`, 'error');
            setButtonState('', '🚀 AutoFill');
            sendResponse({ success: false, error: error.message });
        }
    }

    // Main autofill function
    async function handleAutofill() {
        setButtonState('loading', '⏳ Working...');
        
        try {
            // Get profile data
            const data = await chrome.storage.local.get(['userProfile']);
            
            if (!data.userProfile) {
                showToast('❌ Please set up your profile first!\nClick extension icon → Setup Profile', 'warning');
                setButtonState('', '🚀 AutoFill');
                return;
            }

            const allFields = findAllFormFields();
            
            if (allFields.length === 0) {
                showToast('❌ No form fields detected!\nTry Debug mode to analyze the page', 'warning');
                setButtonState('', '🚀 AutoFill');
                return;
            }
            
            // Analyze and fill fields
            const analyzedFields = allFields.map(field => {
                const associatedTexts = findAssociatedText(field);
                const detectedType = detectFieldType(field, associatedTexts);
                return { element: field, type: detectedType, texts: associatedTexts };
            });
            
            const fillableFields = analyzedFields.filter(field => field.type !== 'unknown');
            
            let filledCount = 0;
            let attemptedCount = 0;
            const results = [];

            console.log('🚀 Starting autofill process...');
            console.log('Profile data:', data.userProfile);
            console.log('Fillable fields:', fillableFields.map(f => ({ type: f.type, element: f.element.tagName })));

            for (const fieldInfo of fillableFields) {
                const value = getValueForFieldType(fieldInfo.type, data.userProfile);
                
                console.log(`Trying to fill ${fieldInfo.type} with value:`, value);
                
                if (value && value.toString().trim()) {
                    attemptedCount++;
                    
                    // Small delay between fills
                    await new Promise(resolve => setTimeout(resolve, 150));
                    
                    const success = fillField(fieldInfo.element, value, fieldInfo.type);
                    if (success) {
                        highlightField(fieldInfo.element, fieldInfo.type);
                        filledCount++;
                        results.push(`✅ ${fieldInfo.type}: "${value}"`);
                        console.log(`✅ Successfully filled ${fieldInfo.type} with "${value}"`);
                    } else {
                        results.push(`❌ ${fieldInfo.type}: failed`);
                        console.log(`❌ Failed to fill ${fieldInfo.type}`);
                    }
                } else {
                    console.log(`⚠️ No value available for ${fieldInfo.type}`);
                }
            }

            // Show comprehensive results
            let message = '';
            if (filledCount > 0) {
                message = `🎉 SUCCESS!\n`;
                message += `Filled ${filledCount}/${attemptedCount} fields\n\n`;
                message += `📊 Stats:\n`;
                message += `• Found: ${allFields.length} total fields\n`;
                message += `• Recognized: ${fillableFields.length} fields\n`;
                message += `• Filled: ${filledCount} fields\n\n`;
                message += `📝 Results:\n`;
                message += results.slice(0, 10).join('\n');
                if (results.length > 10) {
                    message += `\n... and ${results.length - 10} more`;
                }
            } else {
                message = `❌ No fields were filled\n\n`;
                message += `📊 Analysis:\n`;
                message += `• Found: ${allFields.length} total fields\n`;
                message += `• Recognized: ${fillableFields.length} fields\n`;
                message += `• Attempted: ${attemptedCount} fields\n\n`;
                message += `💡 Try Debug mode to see field analysis`;
            }

            showToast(message, filledCount > 0 ? 'success' : 'warning');
            setButtonState(filledCount > 0 ? 'success' : '', '🚀 AutoFill');

        } catch (error) {
            console.error('Autofill error:', error);
            showToast(`❌ Error: ${error.message}`, 'error');
            setButtonState('', '🚀 AutoFill');
        }
    }

    // Message listener for popup communication
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'fillForm') {
            // If profile is provided in the request, use it directly
            if (request.profile) {
                handleAutofillWithProfile(request.profile, sendResponse);
            } else {
                // Otherwise, get profile from storage
                handleAutofill();
                sendResponse({ success: true });
            }
            return true; // Keep the message channel open for async response
        }
        
        if (request.action === 'scanForm') {
            const fields = findAllFormFields();
            const analyzedFields = fields.map(field => {
                const associatedTexts = findAssociatedText(field);
                const detectedType = detectFieldType(field, associatedTexts);
                return { 
                    element: field.tagName, 
                    type: detectedType, 
                    name: field.name || field.id || 'unnamed',
                    placeholder: field.placeholder || ''
                };
            });
            
            sendResponse({ 
                success: true, 
                fields: analyzedFields 
            });
            return true;
        }
    });

    // Initialize UI when page loads
    if (isJobPage()) {
        createFloatingUI();
    }

    // Re-check for job pages on navigation
    const observer = new MutationObserver(() => {
        if (isJobPage() && !shadowHost) {
            createFloatingUI();
        }
    });

    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });

})();