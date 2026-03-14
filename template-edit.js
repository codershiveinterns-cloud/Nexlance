/**
 * Template Editing System
 * Handles edit mode, save changes, project completion, and template download
 */

document.addEventListener('DOMContentLoaded', function() {
    let isEditMode = false;
    let editableElements = [];
    const TEMPLATE_DOWNLOAD_PRICE_EUR = 199;

    function isTemplateUserLoggedIn() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('nexlance_user') || 'null');
            return localStorage.getItem('nexlance_auth') === '1' && Boolean(currentUser && currentUser.email);
        } catch (error) {
            return false;
        }
    }

    function redirectToTemplateAuth() {
        const templatePath = window.location.pathname.split('/').pop() || 'templates.html';
        localStorage.setItem('nexlance_template_redirect', templatePath);
        window.location.href = `login.html?redirect=${encodeURIComponent(templatePath)}`;
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                if (existing.dataset.loaded === 'true') {
                    resolve();
                    return;
                }
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.addEventListener('load', () => {
                script.dataset.loaded = 'true';
                resolve();
            }, { once: true });
            script.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), { once: true });
            document.head.appendChild(script);
        });
    }

    async function ensurePaymentModule() {
        if (window.NexlancePayments) return window.NexlancePayments;
        await loadScript('payment.js');
        if (!window.NexlancePayments) {
            throw new Error('Payment module could not be loaded.');
        }
        return window.NexlancePayments;
    }

    if (!isTemplateUserLoggedIn()) {
        redirectToTemplateAuth();
        return;
    }

    function getTemplateProjectId() {
        return window.location.pathname.split('/').pop().replace('.html', '') || 'template-project';
    }

    function getTemplateName() {
        return document.title.replace(' - Nexlance', '').replace('Template', '').trim() || 'Template Project';
    }

    function getTemplateStorageKey() {
        return `nexlance_template_state_${getTemplateProjectId()}`;
    }

    function getTemplatePurchaseStorageKey() {
        let currentUser = null;
        try {
            currentUser = JSON.parse(localStorage.getItem('nexlance_user') || 'null');
        } catch (error) {
            currentUser = null;
        }
        const email = currentUser && currentUser.email ? String(currentUser.email).trim().toLowerCase() : 'guest';
        return `nexlance_template_purchases_${email.replace(/[.#$/\[\]]/g, '_')}`;
    }

    function getTemplatePurchases() {
        try {
            return JSON.parse(localStorage.getItem(getTemplatePurchaseStorageKey()) || '{}');
        } catch (error) {
            return {};
        }
    }

    function saveTemplatePurchases(purchases) {
        localStorage.setItem(getTemplatePurchaseStorageKey(), JSON.stringify(purchases));
    }

    function hasTemplateBeenPurchased(templateId = getTemplateProjectId()) {
        const purchases = getTemplatePurchases();
        return Boolean(purchases[templateId] && purchases[templateId].paid === true);
    }

    function markTemplateAsPurchased(templateId = getTemplateProjectId(), templateName = getTemplateName()) {
        const purchases = getTemplatePurchases();
        purchases[templateId] = {
            paid: true,
            templateName,
            amount: TEMPLATE_DOWNLOAD_PRICE_EUR,
            currency: 'EUR',
            purchasedAt: new Date().toISOString()
        };
        saveTemplatePurchases(purchases);
    }

    function getProjectsData() {
        try {
            return JSON.parse(localStorage.getItem('nexlance_projects') || '[]');
        } catch (error) {
            return [];
        }
    }

    function setProjectsData(projectsData) {
        localStorage.setItem('nexlance_projects', JSON.stringify(projectsData));
    }

    function getSavedTemplateState() {
        try {
            return JSON.parse(localStorage.getItem(getTemplateStorageKey()) || 'null');
        } catch (error) {
            return null;
        }
    }

    function setSavedTemplateState(pageState) {
        localStorage.setItem(getTemplateStorageKey(), JSON.stringify(pageState));
    }
    
    // =========================================
    // Initialize editing UI
    // =========================================
    function initializeEditingUI() {
        if (document.getElementById('templateEditButton')) {
            return; // Already initialized
        }
        
        // Create edit button container
        const editContainer = document.createElement('div');
        editContainer.id = 'templateEditContainer';
        editContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            max-width: 300px;
        `;
        
        // Edit button
        const editButton = document.createElement('button');
        editButton.id = 'templateEditButton';
        editButton.textContent = 'Edit';
        editButton.style.cssText = `
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        `;
        
        editButton.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
        });
        
        editButton.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        });
        
        editButton.addEventListener('click', toggleEditMode);
        
        editContainer.appendChild(editButton);
        document.body.appendChild(editContainer);
        
        // Add styles for editable elements
        const style = document.createElement('style');
        style.textContent = `
            .template-editable {
                position: relative;
                transition: all 0.2s ease;
            }
            
            .template-editable:hover {
                outline: 2px dashed #667eea;
                outline-offset: 2px;
                border-radius: 4px;
            }
            
            .template-editable[contenteditable="true"] {
                outline: 2px solid #667eea;
                outline-offset: 2px;
                border-radius: 4px;
                background-color: rgba(102, 126, 234, 0.05);
                padding: 8px;
                min-height: 20px;
            }
            
            .template-editable[contenteditable="true"]:focus {
                outline: 2px solid #764ba2;
                background-color: rgba(118, 75, 162, 0.1);
            }
            
            .template-edit-mode-active .template-editable {
                cursor: text;
            }
            
            .template-edit-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.1);
                pointer-events: none;
                z-index: 1000;
                display: none;
            }
            
            .template-edit-mode-active .template-edit-overlay {
                display: block;
                pointer-events: none;
            }
            
            #templateEditButton.editing-active {
                background: linear-gradient(135deg, #f093fb, #f5576c);
                box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
            }
            
            #saveChangesButton, #projectCompletedButton, #downloadTemplateButton {
                padding: 10px 20px;
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            }
            
            #saveChangesButton:hover, #projectCompletedButton:hover, #downloadTemplateButton:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(16, 185, 129, 0.6);
            }
            
            .download-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                z-index: 10001;
                max-width: 400px;
                text-align: center;
                display: none;
            }
            
            .download-popup.show {
                display: block;
                animation: slideIn 0.3s ease;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -55%);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
            }
            
            .download-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.3);
                display: none;
                z-index: 10000;
            }
            
            .download-popup-overlay.show {
                display: block;
            }
            
            .download-popup h3 {
                margin: 0 0 15px 0;
                font-size: 20px;
                color: #333;
            }
            
            .download-popup p {
                margin: 0 0 25px 0;
                font-size: 14px;
                color: #666;
                line-height: 1.5;
            }
            
            .download-popup-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            
            .download-popup-buttons button {
                padding: 10px 25px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .download-popup-buttons .btn-yes {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
            }
            
            .download-popup-buttons .btn-yes:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            }
            
            .download-popup-buttons .btn-no {
                background: #e5e7eb;
                color: #333;
            }
            
            .download-popup-buttons .btn-no:hover {
                background: #d1d5db;
            }
        `;
        document.head.appendChild(style);
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'template-edit-overlay';
        document.body.appendChild(overlay);
        
        // Create download popup
        createDownloadPopup();
    }
    
    // =========================================
    // Toggle edit mode
    // =========================================
    function toggleEditMode() {
        isEditMode = !isEditMode;
        const editButton = document.getElementById('templateEditButton');
        
        if (isEditMode) {
            activateEditMode();
            editButton.classList.add('editing-active');
            editButton.textContent = 'Editing Mode';
        } else {
            deactivateEditMode();
            editButton.classList.remove('editing-active');
            editButton.textContent = 'Edit';
            removeEditButtons();
        }
    }
    
    // =========================================
    // Activate edit mode
    // =========================================
    function activateEditMode() {
        document.body.classList.add('template-edit-mode-active');
        editableElements = [];
        
        // Mark all text content, headings, paragraphs, and common editable elements
        const selectorsToEdit = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p:not(script):not(style)',
            'a',
            'button:not(#templateEditButton):not(#saveChangesButton):not(#projectCompletedButton):not(#downloadTemplateButton)',
            'span:not(script):not(style)',
            'li',
            'label'
        ];
        
        document.querySelectorAll(selectorsToEdit.join(',')).forEach(element => {
            // Skip elements that are scripts, styles, or empty
            if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return;
            if (!element.textContent.trim()) return;
            
            // Skip certain parent elements
            if (element.closest('nav') && element.tagName !== 'A') return;
            if (element.parentElement && element.parentElement.id === 'templateEditContainer') return;
            
            element.classList.add('template-editable');
            element.setAttribute('data-original-content', element.innerHTML);
            editableElements.push(element);
            
            // Make contenteditable
            if (element.tagName !== 'A' && element.tagName !== 'BUTTON') {
                element.contentEditable = false; // Will be toggled on click
                
                element.addEventListener('click', function(e) {
                    if (isEditMode) {
                        e.stopPropagation();
                        this.contentEditable = true;
                        this.focus();
                    }
                });
                
                element.addEventListener('blur', function() {
                    if (this.contentEditable === 'true') {
                        this.contentEditable = false;
                    }
                });
            }
        });
        
        // Add save changes and project completed buttons
        addEditModeButtons();
    }
    
    // =========================================
    // Deactivate edit mode
    // =========================================
    function deactivateEditMode() {
        document.body.classList.remove('template-edit-mode-active');
        
        editableElements.forEach(element => {
            element.contentEditable = false;
        });
        
        removeEditButtons();
    }
    
    // =========================================
    // Add save and project buttons
    // =========================================
    function addEditModeButtons() {
        const editContainer = document.getElementById('templateEditContainer');
        
        // Remove existing buttons if any
        const existingButtons = editContainer.querySelectorAll('#saveChangesButton, #projectCompletedButton, #downloadTemplateButton');
        existingButtons.forEach(btn => btn.remove());
        
        // Save changes button
        const saveButton = document.createElement('button');
        saveButton.id = 'saveChangesButton';
        saveButton.textContent = 'Save Changes';
        saveButton.style.cssText = `
            padding: 10px 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        `;
        
        saveButton.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.6)';
        });
        
        saveButton.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
        });
        
        saveButton.addEventListener('click', handleSaveChanges);
        
        editContainer.appendChild(saveButton);
    }
    
    // =========================================
    // Handle save changes
    // =========================================
    function handleSaveChanges() {
        // Make all editable elements non-editable
        editableElements.forEach(element => {
            element.contentEditable = false;
        });
        
        // Get template name from page title or URL
        const templateName = document.title.replace(' - Nexlance', '').replace('Template', '').trim() || 'Template Project';
        const templateUrl = window.location.href;
        
        // Create/update project with "Development" status (In Progress)
        createInProgressProject(templateName, templateUrl);
        
        const editContainer = document.getElementById('templateEditContainer');
        const saveButton = document.getElementById('saveChangesButton');
        
        // Remove save button and add project completed button
        saveButton.remove();
        
        // Project completed button
        const projectButton = document.createElement('button');
        projectButton.id = 'projectCompletedButton';
        projectButton.textContent = 'Project Completed';
        projectButton.style.cssText = `
            padding: 10px 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        `;
        
        projectButton.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.6)';
        });
        
        projectButton.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
        });
        
        projectButton.addEventListener('click', handleProjectCompleted);
        
        editContainer.appendChild(projectButton);
        
        // Show success toast
        showToast('Changes saved! Project created as "In Progress" on dashboard.', 'success');
    }
    
    // =========================================
    // Create In-Progress Project (Save Changes)
    // =========================================
    function createInProgressProject(templateName, templateUrl) {
        try {
            let projectsData = JSON.parse(localStorage.getItem('nexlance_projects') || '[]');
            
            const projectId = templateUrl.split('/').pop().replace('.html', '');
            
            const inProgressProject = {
                id: projectId,
                name: templateName,
                client_name: 'Self',
                start_date: new Date().toISOString().split('T')[0],
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'Development', // In Progress status
                assigned_team: 'You',
                progress: 50, // 50% progress for in-progress projects
                scope: 'Website template customization',
                deliverables: 'Customized website based on ' + templateName,
                url: templateUrl,
                savedAt: new Date().toISOString(),
                content: getEditedContent()
            };
            
            const projectIndex = projectsData.findIndex(p => p.id === projectId);
            
            if (projectIndex > -1) {
                // Update existing project
                projectsData[projectIndex] = {
                    ...projectsData[projectIndex],
                    ...inProgressProject,
                    updatedAt: new Date().toISOString()
                };
            } else {
                // Add new project
                projectsData.push(inProgressProject);
            }
            
            localStorage.setItem('nexlance_projects', JSON.stringify(projectsData));
            
            // Dispatch custom event to update dashboard
            window.dispatchEvent(new CustomEvent('nexlance-project-updated', {
                detail: { projectId, status: 'Development', progress: 50 }
            }));
            
        } catch (error) {
            console.error('Error creating in-progress project:', error);
        }
    }
    
    // =========================================
    // Handle project completed
    // =========================================
    function handleProjectCompleted() {
        // Get template name from page title or URL
        const templateName = document.title.replace(' - Nexlance', '').replace('Template', '').trim() || 'Template Project';
        const templateUrl = window.location.href;
        
        // Update existing project from Development to Live
        updateProjectToLive(templateName, templateUrl);
        
        // Remove project completed button and show download button
        const projectButton = document.getElementById('projectCompletedButton');
        projectButton.remove();
        
        const downloadButton = document.createElement('button');
        downloadButton.id = 'downloadTemplateButton';
        downloadButton.textContent = 'Download Template';
        downloadButton.style.cssText = `
            padding: 10px 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        `;
        
        downloadButton.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.6)';
        });
        
        downloadButton.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
        });
        
        downloadButton.addEventListener('click', function() {
            showDownloadPopup(templateName);
        });
        
        const editContainer = document.getElementById('templateEditContainer');
        editContainer.appendChild(downloadButton);
        
        // Deactivate edit mode
        deactivateEditMode();
        const editButton = document.getElementById('templateEditButton');
        editButton.classList.remove('editing-active');
        editButton.textContent = 'Edit';
        
        showToast('Project marked as Live! Download your completed template.', 'success');
    }
    
    // =========================================
    // Update Project to Live (Complete)
    // =========================================
    function updateProjectToLive(templateName, templateUrl) {
        try {
            let projectsData = JSON.parse(localStorage.getItem('nexlance_projects') || '[]');
            
            const projectId = templateUrl.split('/').pop().replace('.html', '');
            const projectIndex = projectsData.findIndex(p => p.id === projectId);
            
            if (projectIndex > -1) {
                projectsData[projectIndex] = {
                    ...projectsData[projectIndex],
                    status: 'Live',
                    progress: 100,
                    completedAt: new Date().toISOString()
                };
                
                localStorage.setItem('nexlance_projects', JSON.stringify(projectsData));
                
                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('nexlance-project-completed', {
                    detail: { projectId, status: 'Live', progress: 100 }
                }));
            }
        } catch (error) {
            console.error('Error updating project to live:', error);
        }
    }
    
    // =========================================
    // Get edited content
    // =========================================
    function getEditedContent() {
        const content = {};
        editableElements.forEach((element, index) => {
            content[index] = element.innerHTML;
        });
        return content;
    }

    function collectHeadMarkupForSave() {
        return Array.from(document.head.children)
            .filter(node => {
                if (node.id === 'nexlance-saved-css' || node.id === 'nexlance-saved-js') return false;
                if (node.tagName === 'SCRIPT') return false;
                if (node.tagName === 'STYLE') {
                    const styleText = node.textContent || '';
                    if (styleText.includes('.template-editable') || styleText.includes('.download-popup')) {
                        return false;
                    }
                }
                return true;
            })
            .map(node => node.outerHTML)
            .join('\n');
    }

    function collectBodyMarkupForSave() {
        const bodyClone = document.body.cloneNode(true);
        bodyClone.querySelectorAll('#templateEditContainer, #downloadPopup, #downloadPopupOverlay, .template-edit-overlay').forEach(node => node.remove());
        bodyClone.querySelectorAll('.template-editable').forEach(element => {
            element.classList.remove('template-editable');
            element.removeAttribute('contenteditable');
            element.removeAttribute('data-original-content');
        });
        return bodyClone.innerHTML;
    }

    function removeSavedOverrides() {
        const savedCss = document.getElementById('nexlance-saved-css');
        const savedJs = document.getElementById('nexlance-saved-js');
        if (savedCss) savedCss.remove();
        if (savedJs) savedJs.remove();
    }

    function applySavedTemplateState(pageState) {
        if (!pageState || !pageState.bodyMarkup) return false;

        removeSavedOverrides();

        if (pageState.headMarkup) {
            const parser = new DOMParser();
            const parsedHead = parser.parseFromString(`<head>${pageState.headMarkup}</head>`, 'text/html').head;

            Array.from(document.head.querySelectorAll('style')).forEach(node => {
                const styleText = node.textContent || '';
                if (styleText.includes('.template-editable') || styleText.includes('.download-popup')) {
                    node.remove();
                }
            });

            document.body.innerHTML = pageState.bodyMarkup;

            if (pageState.css) {
                const styleTag = document.createElement('style');
                styleTag.id = 'nexlance-saved-css';
                styleTag.textContent = pageState.css;
                document.head.appendChild(styleTag);
            }

            if (pageState.js) {
                const scriptTag = document.createElement('script');
                scriptTag.id = 'nexlance-saved-js';
                scriptTag.textContent = pageState.js;
                document.body.appendChild(scriptTag);
            }

            if (parsedHead.querySelector('title')) {
                document.title = parsedHead.querySelector('title').textContent;
            }
        } else {
            document.body.innerHTML = pageState.bodyMarkup;
        }

        return true;
    }

    function restoreSavedTemplateState() {
        return applySavedTemplateState(getSavedTemplateState());
    }

    function syncProjectSavedState(pageState) {
        const projectsData = getProjectsData();
        const projectId = getTemplateProjectId();
        const projectIndex = projectsData.findIndex(project => project.id === projectId);

        if (projectIndex > -1) {
            projectsData[projectIndex] = {
                ...projectsData[projectIndex],
                savedAt: pageState.savedAt,
                content: pageState.content,
                pageState
            };
            setProjectsData(projectsData);
        }
    }

    async function persistTemplateState() {
        const documentAssetUrls = gatherAssetUrlsFromDocument();
        const { assetMap, usedNames } = createAssetMap(documentAssetUrls);
        const css = await buildExportCss(assetMap, usedNames);
        const js = await buildExportJs();
        const pageState = {
            projectId: getTemplateProjectId(),
            templateName: getTemplateName(),
            url: window.location.href,
            savedAt: new Date().toISOString(),
            headMarkup: collectHeadMarkupForSave(),
            bodyMarkup: collectBodyMarkupForSave(),
            htmlStructure: '<!DOCTYPE html>\n' + document.documentElement.outerHTML,
            css,
            js,
            content: getEditedContent()
        };

        setSavedTemplateState(pageState);
        syncProjectSavedState(pageState);
        return pageState;
    }

    function isLocalResourceUrl(url) {
        if (!url) return false;

        try {
            const resolved = new URL(url, window.location.href);
            return resolved.origin === window.location.origin;
        } catch (error) {
            return false;
        }
    }

    function escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function normalizeDownloadName(name) {
        return (name || 'asset')
            .split('?')[0]
            .split('#')[0]
            .replace(/^.*[\\/]/, '')
            .replace(/[^\w.-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'asset';
    }

    function getMimeType(filename) {
        const extension = (filename.split('.').pop() || '').toLowerCase();
        const types = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            webp: 'image/webp',
            gif: 'image/gif',
            svg: 'image/svg+xml',
            avif: 'image/avif',
            ico: 'image/x-icon'
        };
        return types[extension] || 'application/octet-stream';
    }

    async function fetchTextResource(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}`);
        }
        return response.text();
    }

    async function fetchBlobResource(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}`);
        }
        return response.blob();
    }

    function extractUrlsFromCss(cssText) {
        const urls = [];
        const matches = cssText.matchAll(/url\((['"]?)(.*?)\1\)/gi);
        for (const match of matches) {
            const assetUrl = (match[2] || '').trim();
            if (!assetUrl || assetUrl.startsWith('data:')) continue;
            urls.push(assetUrl);
        }
        return urls;
    }

    function extractUrlsFromSrcset(srcset) {
        return (srcset || '')
            .split(',')
            .map(part => part.trim().split(/\s+/)[0])
            .filter(Boolean);
    }

    function rewriteSrcset(srcset, assetMap) {
        return (srcset || '')
            .split(',')
            .map(part => {
                const trimmed = part.trim();
                if (!trimmed) return trimmed;
                const pieces = trimmed.split(/\s+/);
                const mapped = assetMap.get(new URL(pieces[0], window.location.href).href);
                if (mapped) pieces[0] = mapped.filename;
                return pieces.join(' ');
            })
            .join(', ');
    }

    function ensureAssetMapping(assetMap, usedNames, absoluteUrl) {
        if (assetMap.has(absoluteUrl)) {
            return assetMap.get(absoluteUrl);
        }

        const baseName = normalizeDownloadName(new URL(absoluteUrl).pathname);
        let filename = baseName;
        let counter = 1;

        while (usedNames.has(filename)) {
            const dotIndex = baseName.lastIndexOf('.');
            if (dotIndex > -1) {
                filename = `${baseName.slice(0, dotIndex)}-${counter}${baseName.slice(dotIndex)}`;
            } else {
                filename = `${baseName}-${counter}`;
            }
            counter += 1;
        }

        const assetEntry = { filename };
        usedNames.add(filename);
        assetMap.set(absoluteUrl, assetEntry);
        return assetEntry;
    }

    function createAssetMap(assetUrls) {
        const assetMap = new Map();
        const usedNames = new Set();

        assetUrls.forEach(url => {
            if (!isLocalResourceUrl(url)) return;
            const absoluteUrl = new URL(url, window.location.href).href;
            ensureAssetMapping(assetMap, usedNames, absoluteUrl);
        });

        return { assetMap, usedNames };
    }

    function rewriteCssAssetUrls(cssText, baseUrl, assetMap, usedNames) {
        return cssText.replace(/url\((['"]?)(.*?)\1\)/gi, (fullMatch, quote, rawUrl) => {
            const assetUrl = (rawUrl || '').trim();
            if (!assetUrl || assetUrl.startsWith('data:') || !isLocalResourceUrl(new URL(assetUrl, baseUrl).href)) {
                return fullMatch;
            }

            const absoluteUrl = new URL(assetUrl, baseUrl).href;
            const asset = ensureAssetMapping(assetMap, usedNames, absoluteUrl);
            return `url(${quote || ''}${asset.filename}${quote || ''})`;
        });
    }

    function gatherAssetUrlsFromDocument() {
        const assetUrls = new Set();

        document.querySelectorAll('img[src], source[src], video[poster], link[rel="icon"]').forEach(element => {
            const attributeName = element.tagName === 'VIDEO'
                ? 'poster'
                : element.tagName === 'LINK'
                    ? 'href'
                    : 'src';
            const value = element.getAttribute(attributeName);
            if (value && isLocalResourceUrl(value)) {
                assetUrls.add(new URL(value, window.location.href).href);
            }
        });

        document.querySelectorAll('[srcset]').forEach(element => {
            extractUrlsFromSrcset(element.getAttribute('srcset')).forEach(url => {
                if (isLocalResourceUrl(url)) {
                    assetUrls.add(new URL(url, window.location.href).href);
                }
            });
        });

        document.querySelectorAll('[style]').forEach(element => {
            extractUrlsFromCss(element.getAttribute('style')).forEach(url => {
                if (isLocalResourceUrl(url)) {
                    assetUrls.add(new URL(url, window.location.href).href);
                }
            });
        });

        return assetUrls;
    }

    async function buildExportCss(assetMap, usedNames) {
        const cssParts = [];
        const stylesheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
            .map(link => link.getAttribute('href'))
            .filter(href => isLocalResourceUrl(href));

        for (const href of stylesheetLinks) {
            const absoluteUrl = new URL(href, window.location.href).href;
            const cssText = await fetchTextResource(absoluteUrl);
            cssParts.push(rewriteCssAssetUrls(cssText, absoluteUrl, assetMap, usedNames));
        }

        Array.from(document.querySelectorAll('style')).forEach(styleTag => {
            const styleText = styleTag.textContent || '';
            if (styleText.includes('.template-editable') || styleText.includes('.download-popup')) {
                return;
            }
            cssParts.push(rewriteCssAssetUrls(styleText, window.location.href, assetMap, usedNames));
        });

        return cssParts.filter(Boolean).join('\n\n').trim();
    }

    async function buildExportJs() {
        const scriptParts = [];
        const scriptElements = Array.from(document.querySelectorAll('script'));

        for (const script of scriptElements) {
            const src = script.getAttribute('src');
            if (src) {
                if (!isLocalResourceUrl(src) || src.includes('template-edit.js')) continue;
                scriptParts.push(await fetchTextResource(new URL(src, window.location.href).href));
                continue;
            }

            const inlineCode = (script.textContent || '').trim();
            if (!inlineCode) continue;
            if (inlineCode.includes('confirmDownload') || inlineCode.includes('cancelDownload')) continue;
            scriptParts.push(inlineCode);
        }

        return scriptParts.join('\n\n').trim();
    }

    function buildExportHtml(templateName, assetMap) {
        const clonedDocument = document.documentElement.cloneNode(true);

        clonedDocument.classList.remove('template-edit-mode-active');

        clonedDocument.querySelectorAll('#templateEditContainer, #downloadPopup, #downloadPopupOverlay, .template-edit-overlay').forEach(node => node.remove());

        clonedDocument.querySelectorAll('.template-editable').forEach(element => {
            element.classList.remove('template-editable');
            element.removeAttribute('contenteditable');
            element.removeAttribute('data-original-content');
        });

        clonedDocument.querySelectorAll('script').forEach(script => script.remove());
        clonedDocument.querySelectorAll('style').forEach(styleTag => {
            const styleText = styleTag.textContent || '';
            if (styleText.includes('.template-editable') || styleText.includes('.download-popup')) {
                styleTag.remove();
            } else {
                styleTag.remove();
            }
        });

        clonedDocument.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove());

        const head = clonedDocument.querySelector('head');
        const body = clonedDocument.querySelector('body');

        if (head) {
            const titleElement = head.querySelector('title');
            if (titleElement) titleElement.textContent = templateName;

            const styleLink = document.createElement('link');
            styleLink.setAttribute('rel', 'stylesheet');
            styleLink.setAttribute('href', 'style.css');
            head.appendChild(styleLink);
        }

        if (body) {
            const scriptTag = document.createElement('script');
            scriptTag.setAttribute('src', 'script.js');
            body.appendChild(scriptTag);
        }

        clonedDocument.querySelectorAll('img[src], source[src], video[poster], link[rel="icon"]').forEach(element => {
            const attributeName = element.tagName === 'VIDEO'
                ? 'poster'
                : element.tagName === 'LINK'
                    ? 'href'
                    : 'src';
            const value = element.getAttribute(attributeName);
            if (!value || !isLocalResourceUrl(value)) return;
            const mapped = assetMap.get(new URL(value, window.location.href).href);
            if (mapped) element.setAttribute(attributeName, mapped.filename);
        });

        clonedDocument.querySelectorAll('[srcset]').forEach(element => {
            const srcset = element.getAttribute('srcset');
            element.setAttribute('srcset', rewriteSrcset(srcset, assetMap));
        });

        clonedDocument.querySelectorAll('[style]').forEach(element => {
            let styleValue = element.getAttribute('style') || '';
            assetMap.forEach((asset, absoluteUrl) => {
                const pathname = new URL(absoluteUrl).pathname;
                const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
                styleValue = styleValue.replace(new RegExp(escapeRegExp(absoluteUrl), 'g'), asset.filename);
                styleValue = styleValue.replace(new RegExp(escapeRegExp(pathname), 'g'), asset.filename);
                styleValue = styleValue.replace(new RegExp(escapeRegExp(relativePath), 'g'), asset.filename);
            });
            element.setAttribute('style', styleValue);
        });

        return '<!DOCTYPE html>\n' + clonedDocument.outerHTML;
    }

    function triggerDownload(filename, content, mimeType) {
        const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    }

    async function downloadWebsiteProject(templateName) {
        const documentAssetUrls = gatherAssetUrlsFromDocument();
        const { assetMap, usedNames } = createAssetMap(documentAssetUrls);
        const cssContent = await buildExportCss(assetMap, usedNames);
        const jsContent = await buildExportJs();
        const htmlContent = buildExportHtml(templateName, assetMap);

        const downloadQueue = [
            { filename: 'index.html', content: htmlContent, mimeType: 'text/html' },
            { filename: 'style.css', content: cssContent, mimeType: 'text/css' },
            { filename: 'script.js', content: jsContent, mimeType: 'text/javascript' }
        ];

        for (const [absoluteUrl, asset] of assetMap.entries()) {
            try {
                const blob = await fetchBlobResource(absoluteUrl);
                downloadQueue.push({
                    filename: asset.filename,
                    content: blob,
                    mimeType: blob.type || getMimeType(asset.filename)
                });
            } catch (error) {
                console.error('Asset download skipped:', absoluteUrl, error);
            }
        }

        downloadQueue.forEach((file, index) => {
            window.setTimeout(() => {
                triggerDownload(file.filename, file.content, file.mimeType);
            }, index * 220);
        });
    }
    
    // =========================================
    // Create download popup
    // =========================================
    function createDownloadPopup() {
        // Popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'download-popup-overlay';
        overlay.id = 'downloadPopupOverlay';
        document.body.appendChild(overlay);
        
        // Popup content
        const popup = document.createElement('div');
        popup.className = 'download-popup';
        popup.id = 'downloadPopup';
        popup.innerHTML = `
            <h3 id="downloadPopupTitle">Download Template</h3>
            <p id="downloadPopupMessage">Your website will download as separate HTML, CSS, JavaScript, and image files you can place in one folder and open locally.</p>
            <div class="download-popup-buttons">
                <button class="btn-yes" id="downloadPopupConfirmBtn" onclick="confirmDownload()">Yes</button>
                <button class="btn-no" onclick="cancelDownload()">No</button>
            </div>
        `;
        document.body.appendChild(popup);
    }

    function updateDownloadPopupContent(templateName) {
        const title = document.getElementById('downloadPopupTitle');
        const message = document.getElementById('downloadPopupMessage');
        const confirmButton = document.getElementById('downloadPopupConfirmBtn');
        const isPurchased = hasTemplateBeenPurchased();

        if (!title || !message || !confirmButton) return;

        if (isPurchased) {
            title.textContent = 'Download Website Files';
            message.textContent = `Pay €${TEMPLATE_DOWNLOAD_PRICE_EUR} to download ${templateName}. After payment, the website files will download immediately.`;
            confirmButton.textContent = 'Download';
            return;
        }

        title.textContent = 'Pay Before Download';
        message.textContent = `Pay €${TEMPLATE_DOWNLOAD_PRICE_EUR} to download ${templateName}. After payment, the website files will download immediately.`;
        confirmButton.textContent = 'Pay €199';
    }
    
    // =========================================
    // Show download popup
    // =========================================
    function showDownloadPopup(templateName) {
        const popup = document.getElementById('downloadPopup');
        const overlay = document.getElementById('downloadPopupOverlay');
        updateDownloadPopupContent(templateName);
        popup.classList.add('show');
        overlay.classList.add('show');
        
        // Store template name for download
        window.pendingDownloadTemplate = templateName;
    }
    
    // =========================================
    // Confirm download
    // =========================================
    window.confirmDownload = async function() {
        const templateName = window.pendingDownloadTemplate || 'template';

        try {
            if (!hasTemplateBeenPurchased()) {
                const payments = await ensurePaymentModule();
                cancelDownload();
                await payments.startTemplatePayment({
                    amount: TEMPLATE_DOWNLOAD_PRICE_EUR * 100,
                    currency: 'eur',
                    productCode: 'template_download',
                    templateId: getTemplateProjectId(),
                    templateName,
                    summaryTitle: templateName,
                    summaryText: 'Template download access',
                    buttonText: `Pay EUR ${TEMPLATE_DOWNLOAD_PRICE_EUR}`,
                    onSuccess: async () => {
                        markTemplateAsPurchased(getTemplateProjectId(), templateName);
                        showToast(`Payment received for ${templateName}. Download starting now.`, 'success');
                        await downloadWebsiteProject(templateName);
                        showToast('Website files downloaded successfully!', 'success');
                    }
                });
                return;
            }

            if (!hasTemplateBeenPurchased()) {
                markTemplateAsPurchased(getTemplateProjectId(), templateName);
                showToast(`Payment of €${TEMPLATE_DOWNLOAD_PRICE_EUR} received for ${templateName}.`, 'success');
            }
            await downloadWebsiteProject(templateName);
            cancelDownload();
            showToast('Website files downloaded successfully!', 'success');
        } catch (error) {
            console.error('Download failed:', error);
            showToast('Could not download the website files. Please try again.', 'error');
        }
    };
    
    // =========================================
    // Cancel download
    // =========================================
    window.cancelDownload = function() {
        const popup = document.getElementById('downloadPopup');
        const overlay = document.getElementById('downloadPopupOverlay');
        
        popup.classList.remove('show');
        overlay.classList.remove('show');
        
        window.pendingDownloadTemplate = null;
    };
    
    // =========================================
    // Remove edit mode buttons
    // =========================================
    function removeEditButtons() {
        const saveButton = document.getElementById('saveChangesButton');
        const projectButton = document.getElementById('projectCompletedButton');
        
        if (saveButton) saveButton.remove();
        if (projectButton) projectButton.remove();
    }
    
    // =========================================
    // Show toast notification
    // =========================================
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10002;
            padding: 16px 24px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async function saveCurrentTemplateState() {
        editableElements.forEach(element => {
            element.contentEditable = false;
        });

        const templateName = getTemplateName();
        const templateUrl = window.location.href;
        const pageState = await persistTemplateState();

        createInProgressProject(templateName, templateUrl, pageState);

        const editContainer = document.getElementById('templateEditContainer');
        const saveButton = document.getElementById('saveChangesButton');

        if (saveButton) {
            saveButton.remove();
        }

        if (editContainer && !document.getElementById('projectCompletedButton')) {
            const projectButton = document.createElement('button');
            projectButton.id = 'projectCompletedButton';
            projectButton.textContent = 'Project Completed';
            projectButton.style.cssText = `
                padding: 10px 20px;
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            `;

            projectButton.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.6)';
            });

            projectButton.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
            });

            projectButton.addEventListener('click', handleProjectCompleted);
            editContainer.appendChild(projectButton);
        }

        showToast('Changes saved and restored automatically when you return.', 'success');
        return pageState;
    }

    function handleSaveChanges() {
        saveCurrentTemplateState().catch(error => {
            console.error('Error saving template state:', error);
            showToast('Could not save your changes. Please try again.', 'error');
        });
    }

    function createInProgressProject(templateName, templateUrl, pageState) {
        try {
            let projectsData = getProjectsData();
            const projectId = templateUrl.split('/').pop().replace('.html', '');

            const inProgressProject = {
                id: projectId,
                name: templateName,
                client_name: 'Self',
                start_date: new Date().toISOString().split('T')[0],
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'Development',
                assigned_team: 'You',
                progress: 50,
                scope: 'Website template customization',
                deliverables: 'Customized website based on ' + templateName,
                url: templateUrl,
                savedAt: pageState ? pageState.savedAt : new Date().toISOString(),
                content: pageState ? pageState.content : getEditedContent(),
                pageState: pageState || null
            };

            const projectIndex = projectsData.findIndex(project => project.id === projectId);

            if (projectIndex > -1) {
                projectsData[projectIndex] = {
                    ...projectsData[projectIndex],
                    ...inProgressProject,
                    updatedAt: new Date().toISOString()
                };
            } else {
                projectsData.push(inProgressProject);
            }

            setProjectsData(projectsData);

            window.dispatchEvent(new CustomEvent('nexlance-project-updated', {
                detail: { projectId, status: 'Development', progress: 50 }
            }));
        } catch (error) {
            console.error('Error creating in-progress project:', error);
        }
    }

    function updateProjectToLive(templateName, templateUrl) {
        try {
            let projectsData = getProjectsData();
            const projectId = templateUrl.split('/').pop().replace('.html', '');
            const projectIndex = projectsData.findIndex(project => project.id === projectId);

            if (projectIndex > -1) {
                projectsData[projectIndex] = {
                    ...projectsData[projectIndex],
                    status: 'Live',
                    progress: 100,
                    completedAt: new Date().toISOString()
                };

                setProjectsData(projectsData);

                window.dispatchEvent(new CustomEvent('nexlance-project-completed', {
                    detail: { projectId, status: 'Live', progress: 100 }
                }));
            }
        } catch (error) {
            console.error('Error updating project to live:', error);
        }
    }
    
    // Initialize when DOM is ready
    restoreSavedTemplateState();
    initializeEditingUI();
});
