// PROFILE.JS - Profile Setup Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('profileForm');
    const skillInput = document.getElementById('skillInput');
    const addSkillBtn = document.getElementById('addSkillBtn');
    const skillsList = document.getElementById('skillsList');
    const loadProfileBtn = document.getElementById('loadProfile');
    const progressFill = document.getElementById('progressFill');
    
    let skills = [];

    // Load existing profile if available
    loadExistingProfile();

    // Skills management
    skillInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkill();
        }
    });

    addSkillBtn.addEventListener('click', addSkill);

    function addSkill() {
        const skill = skillInput.value.trim();
        if (skill && !skills.includes(skill)) {
            skills.push(skill);
            renderSkills();
            skillInput.value = '';
            updateProgress();
        }
    }

    function removeSkill(index) {
        skills.splice(index, 1);
        renderSkills();
        updateProgress();
    }

    function renderSkills() {
        skillsList.innerHTML = '';
        skills.forEach((skill, index) => {
            const skillTag = document.createElement('div');
            skillTag.className = 'skill-tag';
            skillTag.innerHTML = `
                ${skill}
                <button type="button" class="skill-remove" data-index="${index}">×</button>
            `;
            skillsList.appendChild(skillTag);
        });
        
        // Add event listeners to remove buttons
        skillsList.querySelectorAll('.skill-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removeSkill(index);
            });
        });
    }

    // Progress tracking
    function updateProgress() {
        const fields = [
            'firstName', 'lastName', 'email', 'phone', 'address', 'city', 
            'experience', 'degree', 'university', 'linkedin', 'coverLetter'
        ];
        
        let filledFields = 0;
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.value.trim()) {
                filledFields++;
            }
        });
        
        if (skills.length > 0) filledFields++;
        
        const progress = Math.round((filledFields / (fields.length + 1)) * 100);
        progressFill.style.width = progress + '%';
    }

    // Add event listeners to all form fields for progress tracking
    const allInputs = document.querySelectorAll('input, textarea');
    allInputs.forEach(input => {
        input.addEventListener('input', updateProgress);
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Basic validation
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        
        if (!firstName || !lastName || !email) {
            showNotification('First name, last name, and email are required.', 'error');
            return;
        }

        const profileData = {
            personalInfo: {
                firstName: firstName,
                lastName: lastName,
                fullName: `${firstName} ${lastName}`,
                email: email,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zipCode: document.getElementById('zipCode').value,
                country: document.getElementById('country').value,
                location: `${document.getElementById('city').value}, ${document.getElementById('state').value}`.replace(', ', '')
            },
            professional: {
                jobTitle: document.getElementById('jobTitle').value,
                company: document.getElementById('company').value,
                experience: document.getElementById('experience').value
            },
            education: {
                degree: document.getElementById('degree').value,
                university: document.getElementById('university').value,
                graduationYear: document.getElementById('graduationYear').value,
                gpa: document.getElementById('gpa').value
            },
            social: {
                linkedin: document.getElementById('linkedin').value,
                portfolio: document.getElementById('portfolio').value
            },
            skills: skills,
            additional: {
                coverLetter: document.getElementById('coverLetter').value
            },
            lastUpdated: new Date().toISOString()
        };

        try {
            await chrome.storage.local.set({ userProfile: profileData });
            showNotification('Profile saved successfully! 🎉', 'success');
            
            // Close the tab after a delay
            setTimeout(() => {
                window.close();
            }, 2000);
        } catch (error) {
            showNotification('Error saving profile: ' + error.message, 'error');
        }
    });

    // Load profile button
    loadProfileBtn.addEventListener('click', loadExistingProfile);

    async function loadExistingProfile() {
        try {
            const data = await chrome.storage.local.get(['userProfile']);
            if (data.userProfile) {
                const profile = data.userProfile;
                
                // Personal Info
                if (profile.personalInfo) {
                    document.getElementById('firstName').value = profile.personalInfo.firstName || '';
                    document.getElementById('lastName').value = profile.personalInfo.lastName || '';
                    document.getElementById('email').value = profile.personalInfo.email || '';
                    document.getElementById('phone').value = profile.personalInfo.phone || '';
                    document.getElementById('address').value = profile.personalInfo.address || '';
                    document.getElementById('city').value = profile.personalInfo.city || '';
                    document.getElementById('state').value = profile.personalInfo.state || '';
                    document.getElementById('zipCode').value = profile.personalInfo.zipCode || '';
                    document.getElementById('country').value = profile.personalInfo.country || '';
                }
                
                // Professional
                if (profile.professional) {
                    document.getElementById('jobTitle').value = profile.professional.jobTitle || '';
                    document.getElementById('company').value = profile.professional.company || '';
                    document.getElementById('experience').value = profile.professional.experience || '';
                }
                
                // Education
                if (profile.education) {
                    document.getElementById('degree').value = profile.education.degree || '';
                    document.getElementById('university').value = profile.education.university || '';
                    document.getElementById('graduationYear').value = profile.education.graduationYear || '';
                    document.getElementById('gpa').value = profile.education.gpa || '';
                }
                
                // Social
                if (profile.social) {
                    document.getElementById('linkedin').value = profile.social.linkedin || '';
                    document.getElementById('portfolio').value = profile.social.portfolio || '';
                }
                
                // Skills
                if (profile.skills && Array.isArray(profile.skills)) {
                    skills = [...profile.skills];
                    renderSkills();
                }
                
                // Additional Info
                if (profile.additional) {
                    document.getElementById('coverLetter').value = profile.additional.coverLetter || '';
                }
                
                updateProgress();
                showNotification('Profile loaded successfully! ✅', 'success');
            } else {
                showNotification('No existing profile found', 'error');
            }
        } catch (error) {
            showNotification('Error loading profile: ' + error.message, 'error');
        }
    }

    function showNotification(message, type) {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Hide notification after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }

    // Initialize progress
    updateProgress();
});