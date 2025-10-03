// Firebase Configuration
const firebaseConfig = {

    apiKey: "AIzaSyCA1-yUg5gbd5wm5Mojt_1ucCv-yJGINYM",

    authDomain: "patatoking-2779b.firebaseapp.com",

    databaseURL: "https://patatoking-2779b-default-rtdb.europe-west1.firebasedatabase.app",

    projectId: "patatoking-2779b",

    storageBucket: "patatoking-2779b.firebasestorage.app",

    messagingSenderId: "898675400683",

    appId: "1:898675400683:web:ff85ca2da80cd07fd1c3ae"

};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global variables
let choiceCounter = 0;
let resultCounter = 0;
let currentEvent = null;
let allEvents = [];
let allChoices = [];
let currentItem = null;
let allItems = [];
let currentStatus = null;
let allStatus = [];

// Make functions globally accessible
window.hideTreeModal = function() {
    const modal = document.getElementById('treeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
    }
};

window.showJsonModal = function() {
    const modal = document.getElementById('jsonModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
    }
};

window.hideJsonModal = function() {
    const modal = document.getElementById('jsonModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
    }
};

window.showItemModal = function() {
    const modal = document.getElementById('itemModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
        clearItemForm();
    }
};

window.hideItemModal = function() {
    const modal = document.getElementById('itemModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
    }
};

window.showStatusModal = function() {
    const modal = document.getElementById('statusModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
        clearStatusForm();
        
        // Initialize autocomplete for status modal inputs
        initializeAutocomplete('statusEventSources', allEvents, 'event');
        initializeAutocomplete('statusChoiceSources', allChoices, 'choice');
        initializeAutocomplete('statusItemSources', allItems, 'item');
        
        // Add event listeners to prerequisite inputs
        const prerequisiteInputs = document.querySelectorAll('#prerequisitesContainer input[data-attribute]');
        prerequisiteInputs.forEach(input => {
            input.addEventListener('input', updateStatusPreview);
        });
    }
};

window.hideStatusModal = function() {
    const modal = document.getElementById('statusModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
    }
};

window.exportEvent = function(index) {
 
    
    try {
        // Use allEvents array (populated from Firebase) instead of localStorage
        if (allEvents.length === 0) {
            showMessage('No events available to export. Please save some events first.', 'error');
            return;
        }
        
        const rootEvent = allEvents[index];
        
        if (!rootEvent) {
            showMessage(`Error: Event not found at index ${index}`, 'error');
            console.error('No event found at index:', index);
            return;
        }
        
        
        const eventTree = collectEventTree(rootEvent, allEvents);
        
        // Check for duplicates (should not happen due to Map usage, but good to verify)
        const eventIds = eventTree.map(event => event.id);
        const uniqueIds = new Set(eventIds);
        const duplicatesFound = eventIds.length !== uniqueIds.size;
        
        if (duplicatesFound) {
            console.warn('Duplicates detected in event tree - this should not happen!');
            const duplicateIds = eventIds.filter((id, index) => eventIds.indexOf(id) !== index);
            console.warn('Duplicate IDs:', duplicateIds);
        } 
        
        // Create export data structure
        const exportData = {
            Event: eventTree,
            exportedAt: new Date().toISOString(),
            totalEvents: eventTree.length,
            metadata: {
                description: `Complete event tree export for: ${rootEvent.title}`,
                includes: 'Root event and all its dependencies (forward and backward)'
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${rootEvent.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showMessage(`Event tree exported successfully! (${eventTree.length} events included)`);
    } catch (error) {
        console.error('Export error:', error);
        showMessage('Export failed: ' + error.message, 'error');
    }
};

// Global tree state
let currentTreeEventIndex = null;
let currentTreeOptions = { showForward: true, showBackward: true, includeChoices: true };

// Global event filter state
let showDependentEventsOnly = true; // Start with dependent events only by default

window.showEventTree = function(eventIndex) {
    currentTreeEventIndex = eventIndex;
    
    // Use current data source (allEvents contains the current events from Firebase or localStorage)
    const rootEvent = allEvents[eventIndex];
    
    if (!rootEvent) {
        showMessage('Event not found', 'error');
        return;
    }
    
    // Build the tree structure with current options
    const treeData = buildEventTree(rootEvent, allEvents, currentTreeOptions);
    
    // Generate SVG
    const svg = generateTreeSVG(treeData, rootEvent.title);
    
    // Show in modal
    const treeContainer = document.getElementById('treeContainer');
    if (treeContainer) {
        treeContainer.innerHTML = svg;
    }
    
    // Update control states
    updateTreeControlStates();
    
    const modal = document.getElementById('treeModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
    }
};

function updateTreeControlStates() {
    // Update view buttons
    document.querySelectorAll('#showBothBtn, #showForwardBtn, #showBackwardBtn').forEach(btn => {
        btn.classList.remove('active-view', 'bg-purple-600');
        btn.classList.add('bg-gray-600');
    });
    
    if (currentTreeOptions.showForward && currentTreeOptions.showBackward) {
        const btn = document.getElementById('showBothBtn');
        btn.classList.add('active-view', 'bg-purple-600');
        btn.classList.remove('bg-gray-600');
    } else if (currentTreeOptions.showForward) {
        const btn = document.getElementById('showForwardBtn');
        btn.classList.add('active-view', 'bg-purple-600');
        btn.classList.remove('bg-gray-600');
    } else if (currentTreeOptions.showBackward) {
        const btn = document.getElementById('showBackwardBtn');
        btn.classList.add('active-view', 'bg-purple-600');
        btn.classList.remove('bg-gray-600');
    }
    
    // Update checkbox
    const checkbox = document.getElementById('includeChoicesCheckbox');
    if (checkbox) {
        checkbox.checked = currentTreeOptions.includeChoices;
    }
}

function refreshTree() {
    if (currentTreeEventIndex !== null) {
        window.showEventTree(currentTreeEventIndex);
    }
}

function setTreeView(showForward, showBackward) {
    currentTreeOptions.showForward = showForward;
    currentTreeOptions.showBackward = showBackward;
    refreshTree();
}

function toggleChoiceInclusion() {
    const checkbox = document.getElementById('includeChoicesCheckbox');
    currentTreeOptions.includeChoices = checkbox.checked;
    refreshTree();
}

// Event filter functions
function showAllEvents() {
    showDependentEventsOnly = false;
    updateEventFilterButtons();
    loadEvents();
}

function showDependentEventsOnlyFilter() {
    showDependentEventsOnly = true;
    updateEventFilterButtons();
    loadEvents();
}

function updateEventFilterButtons() {
    const allEventsBtn = document.getElementById('showAllEventsBtn');
    const dependentEventsBtn = document.getElementById('showDependentEventsBtn');
    
    if (allEventsBtn && dependentEventsBtn) {
        // Remove active class from both
        allEventsBtn.classList.remove('active-filter', 'bg-yellow-600');
        dependentEventsBtn.classList.remove('active-filter', 'bg-orange-600');
        
        // Add gray background to both
        allEventsBtn.classList.add('bg-gray-600');
        dependentEventsBtn.classList.add('bg-gray-600');
        
        if (showDependentEventsOnly) {
            // Activate dependent events button
            dependentEventsBtn.classList.add('active-filter', 'bg-orange-600');
            dependentEventsBtn.classList.remove('bg-gray-600');
        } else {
            // Activate all events button
            allEventsBtn.classList.add('active-filter', 'bg-yellow-600');
            allEventsBtn.classList.remove('bg-gray-600');
        }
    }
}

window.toggleChoice = function(choiceId) {
    const choiceElement = document.querySelector(`[data-choice-id="${choiceId}"]`);
    if (!choiceElement) return;
    
    const content = choiceElement.querySelector('.choice-content');
    const icon = choiceElement.querySelector('.collapse-icon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        // Expand
        content.style.display = 'block';
        icon.textContent = '−';
        choiceElement.classList.remove('collapsed');
    } else {
        // Collapse
        content.style.display = 'none';
        icon.textContent = '+';
        choiceElement.classList.add('collapsed');
    }
};

window.toggleTrigger = function() {
    const triggerSection = document.querySelector('.bg-gray-700.rounded-xl');
    if (!triggerSection) return;
    
    const content = triggerSection.querySelector('.trigger-content');
    const icon = triggerSection.querySelector('.collapse-icon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        // Expand
        content.style.display = 'block';
        icon.textContent = '−';
        triggerSection.classList.remove('collapsed');
    } else {
        // Collapse
        content.style.display = 'none';
        icon.textContent = '+';
        triggerSection.classList.add('collapsed');
    }
};

window.toggleReferenceList = function() {
    const content = document.querySelector('.reference-list-content');
    const icon = document.querySelector('.reference-list-content').parentElement.querySelector('.collapse-icon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        // Expand
        content.style.display = 'block';
        icon.textContent = '−';
    } else {
        // Collapse
        content.style.display = 'none';
        icon.textContent = '+';
    }
};

window.toggleItemsContainer = function() {
    const content = document.querySelector('.items-content');
    const icon = content?.parentElement.querySelector('.collapse-icon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        // Expand
        content.style.display = 'block';
        icon.textContent = '−';
    } else {
        // Collapse
        content.style.display = 'none';
        icon.textContent = '+';
    }
};

window.toggleStatusContainer = function() {
    const content = document.querySelector('.status-content');
    const icon = content?.parentElement.querySelector('.collapse-icon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        // Expand
        content.style.display = 'block';
        icon.textContent = '−';
    } else {
        // Collapse
        content.style.display = 'none';
        icon.textContent = '+';
    }
};

window.toggleEventBuilder = function() {
    const content = document.querySelector('.event-builder-content');
    const icon = content?.parentElement.querySelector('.collapse-icon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        // Expand
        content.style.display = 'block';
        icon.textContent = '−';
    } else {
        // Collapse
        content.style.display = 'none';
        icon.textContent = '+';
    }
};

window.toggleSavedEvents = function() {
    const content = document.querySelector('.saved-events-content');
    const icon = content?.parentElement.querySelector('.collapse-icon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        // Expand
        content.style.display = 'block';
        icon.textContent = '−';
    } else {
        // Collapse
        content.style.display = 'none';
        icon.textContent = '+';
    }
};

window.collapseAllContainers = function() {
    // Collapse Event Builder
    const eventBuilderContent = document.querySelector('.event-builder-content');
    const eventBuilderIcon = eventBuilderContent?.parentElement.querySelector('.collapse-icon');
    if (eventBuilderContent && eventBuilderIcon) {
        eventBuilderContent.style.display = 'none';
        eventBuilderIcon.textContent = '+';
    }
    
    // Collapse Saved Events
    const savedEventsContent = document.querySelector('.saved-events-content');
    const savedEventsIcon = savedEventsContent?.parentElement.querySelector('.collapse-icon');
    if (savedEventsContent && savedEventsIcon) {
        savedEventsContent.style.display = 'none';
        savedEventsIcon.textContent = '+';
    }
    
    // Collapse Items
    const itemsContent = document.querySelector('.items-content');
    const itemsIcon = itemsContent?.parentElement.querySelector('.collapse-icon');
    if (itemsContent && itemsIcon) {
        itemsContent.style.display = 'none';
        itemsIcon.textContent = '+';
    }
    
    // Collapse Status
    const statusContent = document.querySelector('.status-content');
    const statusIcon = statusContent?.parentElement.querySelector('.collapse-icon');
    if (statusContent && statusIcon) {
        statusContent.style.display = 'none';
        statusIcon.textContent = '+';
    }
    
    // Collapse Event Ideas
    const eventIdeasContent = document.querySelector('.event-ideas-content');
    const eventIdeasIcon = eventIdeasContent?.parentElement.querySelector('.collapse-icon');
    if (eventIdeasContent && eventIdeasIcon) {
        eventIdeasContent.style.display = 'none';
        eventIdeasIcon.textContent = '+';
    }
    
    // Collapse Reference Lists
    const referenceContent = document.querySelector('.reference-list-content');
    const referenceIcon = referenceContent?.parentElement.querySelector('.collapse-icon');
    if (referenceContent && referenceIcon) {
        referenceContent.style.display = 'none';
        referenceIcon.textContent = '+';
    }
    
    // Show success message
    showMessage('All containers collapsed!', 'success');
};

function collapseAllChoices() {
    const choiceElements = document.querySelectorAll('.choice-item');
    choiceElements.forEach(choiceElement => {
        const content = choiceElement.querySelector('.choice-content');
        const icon = choiceElement.querySelector('.collapse-icon');
        
        if (content && icon) {
            content.style.display = 'none';
            icon.textContent = '+';
            choiceElement.classList.add('collapsed');
        }
    });
}

function expandAllChoices() {
    const choiceElements = document.querySelectorAll('.choice-item');
    choiceElements.forEach(choiceElement => {
        const content = choiceElement.querySelector('.choice-content');
        const icon = choiceElement.querySelector('.collapse-icon');
        
        if (content && icon) {
            content.style.display = 'block';
            icon.textContent = '−';
            choiceElement.classList.remove('collapsed');
        }
    });
}

// Utility functions
function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function showMessage(text, type = 'success') {
    const existingMessage = document.querySelector('.toast-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const message = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    message.className = `toast-message fixed top-4 left-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 -translate-x-full`;
    message.textContent = text;
    
    document.body.appendChild(message);
    
    // Animate in
    setTimeout(() => {
        message.classList.remove('-translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        message.classList.add('-translate-x-full');
        setTimeout(() => {
            message.remove();
        }, 300);
    }, 3000);
}

function parseCommaSeparatedIds(input) {
    if (!input || input.trim() === '') return [];
    return input.split(',').map(id => id.trim()).filter(id => id !== '');
}

function getSelectedValues(inputId) {
    const selected = selectedDependencies.events.get(inputId) || 
                    selectedDependencies.choices.get(inputId) || 
                    selectedDependencies.items.get(inputId) ||
                    selectedDependencies.status.get(inputId);
    return selected ? Array.from(selected) : [];
}

function getSelectedValuesFromElement(inputElement) {
    if (!inputElement) return [];
    
    // Find the selected container for this input
    const container = inputElement.parentElement.parentElement;
    
    let selectedContainer;
    if (inputElement.classList.contains('choice-source-events')) {
        selectedContainer = container.querySelector('.choice-source-events-selected');
    } else if (inputElement.classList.contains('choice-source-choices')) {
        selectedContainer = container.querySelector('.choice-source-choices-selected');
    } else if (inputElement.classList.contains('choice-source-status')) {
        selectedContainer = container.querySelector('.choice-source-status-selected');
    } else if (inputElement.classList.contains('choice-source-items')) {
        selectedContainer = container.querySelector('.choice-source-items-selected');
    } else if (inputElement.classList.contains('choice-dependent-events')) {
        // Backward compatibility
        selectedContainer = container.querySelector('.choice-dependent-events-selected');
    } else if (inputElement.classList.contains('choice-dependent-choices')) {
        // Backward compatibility
        selectedContainer = container.querySelector('.choice-dependent-choices-selected');
    }
    
    if (!selectedContainer) return [];
    
    const badges = selectedContainer.querySelectorAll('[data-item-id]');
    return Array.from(badges).map(badge => badge.dataset.itemId);
}

function setSelectedValues(inputId, values) {
    if (!values || values.length === 0) return;
    
    // This will be handled when the autocomplete is initialized
    // Store the values to be set later
    if (!window.pendingSelections) window.pendingSelections = {};
    window.pendingSelections[inputId] = values;
}

function setSelectedValuesFromElement(inputElement, values) {
    if (!inputElement || !values || values.length === 0) return;
    
    // Store values to be set when autocomplete is ready
    inputElement.dataset.pendingValues = JSON.stringify(values);
}

function processPendingSelections(inputId, items, type, selectedContainer, dropdown) {
    // Check if there are pending selections for this input
    if (window.pendingSelections && window.pendingSelections[inputId]) {
        const pendingValues = window.pendingSelections[inputId];
        
        // Process each pending value
        pendingValues.forEach(itemId => {
            // Find the item in the items array
            const item = items.find(i => i.id === itemId);
            if (item) {
                // Use the existing selectItem function to add it
                selectItem(item, type, inputId, selectedContainer, dropdown);
            }
        });
        
        // Clear the pending selections for this input
        delete window.pendingSelections[inputId];
    }
}

function processPendingValuesFromElement(input, items, type, selectedContainer, dropdown, uniqueId) {
    // Check if there are pending values stored in the input element
    if (input.dataset.pendingValues) {
        try {
            const pendingValues = JSON.parse(input.dataset.pendingValues);
            
            // Process each pending value
            pendingValues.forEach(itemId => {
                // Find the item in the items array
                const item = items.find(i => i.id === itemId);
                if (item) {
                    // Use the existing selectItem function to add it
                    selectItem(item, type, uniqueId, selectedContainer, dropdown);
                }
            });
            
            // Clear the pending values from the input element
            delete input.dataset.pendingValues;
        } catch (error) {
            console.error('Error processing pending values:', error);
        }
    }
}

// Reference list management functions
function updateReferenceLists() {
    updateEventsList();
    updateChoicesList();
    updateStatusReferenceList();
    updateDependencySelects();
}

function updateEventsList() {
    const eventsListContainer = document.getElementById('eventsList');
    
    if (allEvents.length === 0) {
        eventsListContainer.innerHTML = '<div class="text-gray-400 text-sm">No events created yet</div>';
        return;
    }
    
    eventsListContainer.innerHTML = allEvents.map(event => 
        `<div class="py-2 px-3 bg-gray-600 rounded mb-2 border border-gray-500">
            <div class="text-blue-200 text-sm font-medium mb-1">${event.title}</div>
            <div class="text-gray-400 text-xs font-mono break-all">${event.id}</div>
        </div>`
    ).join('');
}

function updateChoicesList() {
    const choicesListContainer = document.getElementById('choicesList');
    
    if (allChoices.length === 0) {
        choicesListContainer.innerHTML = '<div class="text-gray-400 text-sm">No choices created yet</div>';
        return;
    }
    
    choicesListContainer.innerHTML = allChoices.map(choice => 
        `<div class="py-2 px-3 bg-gray-600 rounded mb-2 border border-gray-500">
            <div class="text-green-200 text-sm font-medium mb-1">${choice.text}</div>
            <div class="text-gray-400 text-xs font-mono break-all">${choice.id}</div>
        </div>`
    ).join('');
}

function updateStatusReferenceList() {
    const statusListContainer = document.getElementById('statusReferenceList');
    
    if (allStatus.length === 0) {
        statusListContainer.innerHTML = '<div class="text-gray-400 text-sm">No status created yet</div>';
        return;
    }
    
    statusListContainer.innerHTML = allStatus.map(status => 
        `<div class="py-2 px-3 bg-gray-600 rounded mb-2 border border-gray-500">
            <div class="text-cyan-200 text-sm font-medium mb-1">${status.name}</div>
            <div class="text-gray-400 text-xs font-mono break-all">${status.id}</div>
        </div>`
    ).join('');
}

// Remove the old getItemsList function as it's now defined above with the new implementation

function updateDependencySelects() {
    // Initialize autocomplete for main dependency inputs
    initializeAutocomplete('dependentEventIds', allEvents, 'event');
    initializeAutocomplete('dependentChoiceIds', allChoices, 'choice');
    initializeAutocomplete('dependentStatusIds', allStatus, 'status');
    initializeAutocomplete('triggerItems', allItems, 'item');
    
    // Initialize autocomplete for choice source inputs
    const choiceElements = document.querySelectorAll('.choice-item');
    choiceElements.forEach(choiceElement => {
        // New source-based inputs
        const eventInput = choiceElement.querySelector('.choice-source-events');
        const choiceInput = choiceElement.querySelector('.choice-source-choices');
        const statusInput = choiceElement.querySelector('.choice-source-status');
        const itemInput = choiceElement.querySelector('.choice-source-items');
        
        if (eventInput) initializeAutocompleteForElement(eventInput, allEvents, 'event');
        if (choiceInput) initializeAutocompleteForElement(choiceInput, allChoices, 'choice');
        if (statusInput) initializeAutocompleteForElement(statusInput, allStatus, 'status');
        if (itemInput) initializeAutocompleteForElement(itemInput, allItems, 'item');
        
        // Backward compatibility for old class names
        const oldEventInput = choiceElement.querySelector('.choice-dependent-events');
        const oldChoiceInput = choiceElement.querySelector('.choice-dependent-choices');
        
        if (oldEventInput) initializeAutocompleteForElement(oldEventInput, allEvents, 'event');
        if (oldChoiceInput) initializeAutocompleteForElement(oldChoiceInput, allChoices, 'choice');
    });
}

// Global storage for selected dependencies
const selectedDependencies = {
    events: new Map(),
    choices: new Map(),
    items: new Map(),
    status: new Map()
};

function initializeAutocomplete(inputId, items, type) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const dropdown = document.getElementById(`${inputId}-dropdown`);
    const selectedContainer = document.getElementById(`${inputId}-selected`);
    
    setupAutocompleteEvents(input, dropdown, selectedContainer, items, type, inputId);
    
    // Process pending selections after autocomplete is set up
    processPendingSelections(inputId, items, type, selectedContainer, dropdown);
}

function initializeAutocompleteForElement(input, items, type) {
    if (!input) return;
    
    // Try new source-based class names first, then fall back to old dependent class names
    const sourceTypeForClass = type === 'status' ? 'status' : type + 's';
    const dependentTypeForClass = type === 'status' ? 'status' : type + 's';
    
    let dropdown = input.parentElement.querySelector(`.choice-source-${sourceTypeForClass}-dropdown`);
    let selectedContainer = input.parentElement.parentElement.querySelector(`.choice-source-${sourceTypeForClass}-selected`);
    
    // Fallback to old class names for backward compatibility
    if (!dropdown) {
        dropdown = input.parentElement.querySelector(`.choice-dependent-${dependentTypeForClass}-dropdown`);
    }
    if (!selectedContainer) {
        selectedContainer = input.parentElement.parentElement.querySelector(`.choice-dependent-${dependentTypeForClass}-selected`);
    }
    
    const uniqueId = `choice-${Date.now()}-${Math.random()}`;
    
    // Store the uniqueId in the input for later reference
    input.dataset.uniqueId = uniqueId;
    
    setupAutocompleteEvents(input, dropdown, selectedContainer, items, type, uniqueId);
    
    // Process pending values stored in the input element
    processPendingValuesFromElement(input, items, type, selectedContainer, dropdown, uniqueId);
}

function setupAutocompleteEvents(input, dropdown, selectedContainer, items, type, uniqueId) {
    // Map type to the correct key in selectedDependencies
    const dependencyKey = type === 'status' ? 'status' : type + 's';
    
    if (!selectedDependencies[dependencyKey].has(uniqueId)) {
        selectedDependencies[dependencyKey].set(uniqueId, new Set());
    }
    
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        showAutocompleteResults(dropdown, items, query, type, uniqueId, selectedContainer);
    });
    
    input.addEventListener('focus', (e) => {
        const query = e.target.value.toLowerCase();
        showAutocompleteResults(dropdown, items, query, type, uniqueId, selectedContainer);
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

function showAutocompleteResults(dropdown, items, query, type, uniqueId, selectedContainer) {
    // Map type to the correct key in selectedDependencies
    const dependencyKey = type === 'status' ? 'status' : type + 's';
    const selected = selectedDependencies[dependencyKey].get(uniqueId);
    const filtered = items.filter(item => {
        let text;
        if (type === 'event') {
            text = item.title;
        } else if (type === 'choice') {
            text = item.text;
        } else if (type === 'item') {
            text = item.name;
        } else if (type === 'status') {
            text = item.name;
        }
        return text.toLowerCase().includes(query) && !selected.has(item.id);
    });
    
    dropdown.innerHTML = '';
    
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="p-3 text-gray-400 text-sm">No matches found</div>';
    } else {
        filtered.forEach(item => {
            const div = document.createElement('div');
            let text, subtitle = '';
            
            if (type === 'event') {
                text = item.title;
            } else if (type === 'choice') {
                text = item.text;
            } else if (type === 'item') {
                text = item.name;
                // Add rarity and price as subtitle for items
                const rarityNames = { '0': 'Common', '1': 'Uncommon', '2': 'Rare', '3': 'Epic', '4': 'Legendary' };
                const rarityName = rarityNames[item.rarity] || 'Unknown';
                subtitle = `${rarityName} - ${item.price} coins`;
            } else if (type === 'status') {
                text = item.name;
                // Add prerequisites and sources count as subtitle for status
                const prereqCount = item.Prerequisites ? item.Prerequisites.length : 0;
                const sourcesCount = item.optionalSources ? item.optionalSources.length : 0;
                subtitle = `${prereqCount} prerequisite(s), ${sourcesCount} source(s)`;
            }
            
            div.className = 'p-3 hover:bg-gray-600 cursor-pointer text-sm border-b border-gray-600 last:border-b-0';
            
            if (subtitle) {
                div.innerHTML = `
                    <div class="font-medium">${text.length > 50 ? text.substring(0, 50) + '...' : text}</div>
                    <div class="text-xs text-gray-400 mt-1">${subtitle}</div>
                `;
            } else {
                div.textContent = text.length > 60 ? text.substring(0, 60) + '...' : text;
            }
            
            div.onclick = () => selectItem(item, type, uniqueId, selectedContainer, dropdown);
            dropdown.appendChild(div);
        });
    }
    
    dropdown.classList.remove('hidden');
}

function selectItem(item, type, uniqueId, selectedContainer, dropdown) {
    // Map type to the correct key in selectedDependencies
    const dependencyKey = type === 'status' ? 'status' : type + 's';
    const selected = selectedDependencies[dependencyKey].get(uniqueId);
    selected.add(item.id);
    
    // Create selected item badge
    const badge = document.createElement('div');
    let text, colorClass;
    
    if (type === 'event') {
        text = item.title;
        colorClass = 'bg-blue-600';
    } else if (type === 'choice') {
        text = item.text;
        colorClass = 'bg-green-600';
    } else if (type === 'item') {
        text = item.name;
        colorClass = 'bg-cyan-600';
    } else if (type === 'status') {
        text = item.name;
        colorClass = 'bg-teal-600';
    }
    
    badge.className = `${colorClass} text-white px-2 py-1 rounded text-xs flex items-center gap-1`;
    badge.innerHTML = `
        <span>${text.length > 20 ? text.substring(0, 20) + '...' : text}</span>
        <button type="button" class="text-white hover:text-gray-300" onclick="removeSelectedItem('${item.id}', '${type}', '${uniqueId}', this)">×</button>
    `;
    badge.dataset.itemId = item.id;
    
    selectedContainer.appendChild(badge);
    dropdown.classList.add('hidden');
    
    // Update status preview if we're in the status modal
    if (selectedContainer && selectedContainer.id && selectedContainer.id.startsWith('status')) {
        updateStatusPreview();
    }
    
    // If selecting a choice, also add its parent event to dependent events
    if (type === 'choice' && item.parentEventId) {
        // Find the dependent events autocomplete for this same element
        const parentElement = dropdown.closest('.choice-item') || dropdown.closest('.bg-gray-700');
        if (parentElement) {
            // Try to find the event input in the same choice or main form
            let eventInput = parentElement.querySelector('.choice-dependent-events');
            let eventSelectedContainer = parentElement.querySelector('.choice-dependent-events-selected');
            
            // If not found in choice, try main form
            if (!eventInput) {
                eventInput = document.getElementById('dependentEventIds');
                eventSelectedContainer = document.getElementById('dependentEventIds-selected');
            }
            
            if (eventInput && eventSelectedContainer) {
                // For choice inputs, we need to use the class name as unique identifier
                const eventUniqueId = eventInput.id || eventInput.className;
                
                // Find the parent event in allEvents
                const parentEvent = allEvents.find(event => event.id === item.parentEventId);
                
                if (parentEvent && eventSelectedContainer) {
                    // Check if parent event is not already in the container
                    const existingBadges = Array.from(eventSelectedContainer.children);
                    const alreadyExists = existingBadges.some(badge => badge.dataset.itemId === parentEvent.id);
                    
                    if (!alreadyExists) {
                        // Get the uniqueId for this event input
                        const eventUniqueIdForDeps = eventInput.dataset.uniqueId || eventInput.id;
                        
                        // Ensure the selectedDependencies entry exists
                        if (!selectedDependencies.events.has(eventUniqueIdForDeps)) {
                            selectedDependencies.events.set(eventUniqueIdForDeps, new Set());
                        }
                        
                        // Add to selectedDependencies
                        const eventSelected = selectedDependencies.events.get(eventUniqueIdForDeps);
                        if (eventSelected) {
                            eventSelected.add(parentEvent.id);
                        }
                        
                        // Add visual badge for the parent event
                        const eventBadge = document.createElement('div');
                        eventBadge.className = 'bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1';
                        eventBadge.innerHTML = `
                            <span>${parentEvent.title.length > 15 ? parentEvent.title.substring(0, 15) + '...' : parentEvent.title} (auto)</span>
                            <button type="button" class="text-white hover:text-gray-300" onclick="removeSelectedItem('${parentEvent.id}', 'event', '${eventUniqueIdForDeps}', this)">×</button>
                        `;
                        eventBadge.dataset.itemId = parentEvent.id;
                        eventSelectedContainer.appendChild(eventBadge);
                        
                        showMessage(`Auto-added parent event: ${parentEvent.title}`, 'success');
                    }
                }
            }
        }
    }
    
    // Clear input
    const input = dropdown.parentElement.querySelector('input');
    input.value = '';
}

function removeSelectedItem(itemId, type, uniqueId, buttonElement) {
    // Map type to the correct key in selectedDependencies
    const dependencyKey = type === 'status' ? 'status' : type + 's';
    const selected = selectedDependencies[dependencyKey].get(uniqueId);
    selected.delete(itemId);
    
    // Remove the badge
    const badge = buttonElement.closest('div');
    const selectedContainer = badge.parentElement;
    badge.remove();
    
    // Update status preview if we're in the status modal
    if (selectedContainer && selectedContainer.id && selectedContainer.id.startsWith('status')) {
        // Use setTimeout to ensure DOM is updated before preview update
        setTimeout(() => {
            updateStatusPreview();
        }, 0);
    }
}

function refreshReferenceLists() {
    // Update from current form - silently generate without error messages
    const currentFormEvent = generateEventJsonSilent();
    if (currentFormEvent) {
        // Add current event to temporary list for display
        const tempEvents = [...allEvents];
        const existingIndex = tempEvents.findIndex(e => e.title === currentFormEvent.title);
        if (existingIndex >= 0) {
            tempEvents[existingIndex] = currentFormEvent;
        } else {
            tempEvents.push(currentFormEvent);
        }
        
        // Update choices from current event
        const tempChoices = [...allChoices];
        currentFormEvent.choices.forEach(choice => {
            const choiceWithParent = {
                ...choice,
                parentEventId: currentFormEvent.id,
                parentEventTitle: currentFormEvent.title
            };
            const existingChoiceIndex = tempChoices.findIndex(c => c.text === choice.text);
            if (existingChoiceIndex >= 0) {
                tempChoices[existingChoiceIndex] = choiceWithParent;
            } else {
                tempChoices.push(choiceWithParent);
            }
        });
        
        // Temporarily update for display
        const originalEvents = allEvents;
        const originalChoices = allChoices;
        allEvents = tempEvents;
        allChoices = tempChoices;
        
        updateReferenceLists();
        
        // Restore original arrays
        allEvents = originalEvents;
        allChoices = originalChoices;
    } else {
        updateReferenceLists();
    }
    
}

// Choice management functions
function addChoice() {
    choiceCounter++;
    const choicesContainer = document.getElementById('choicesContainer');
    
    const choiceDiv = document.createElement('div');
    choiceDiv.className = 'choice-item bg-gray-700 rounded-xl p-6 border border-gray-600';
    choiceDiv.dataset.choiceId = choiceCounter;
    
    choiceDiv.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h4 class="choice-header text-lg font-semibold text-orange-400">Choice ${choiceCounter}</h4>
            <div class="flex gap-2">
                <button type="button" class="collapse-btn px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="toggleChoice(${choiceCounter})">
                    <span class="collapse-icon">−</span>
                </button>
                <button type="button" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="removeChoice(${choiceCounter})">Remove</button>
            </div>
        </div>
        
        <div class="choice-content space-y-4">
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-300">Choice Text</label>
                <textarea class="choice-text w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none" placeholder="What does this choice say?" rows="2" required></textarea>
            </div>
            
            <div class="space-y-4">
                <h5 class="text-md font-medium text-cyan-400 border-b border-gray-500 pb-2">Sources</h5>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Event Sources -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-blue-300">Event Sources</label>
                        <div class="relative">
                            <input type="text" class="choice-source-events w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                                   placeholder="Type event name..." autocomplete="off">
                            <div class="choice-source-events-dropdown absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-lg mt-1 max-h-32 overflow-y-auto hidden">
                            </div>
                        </div>
                        <div class="choice-source-events-selected flex flex-wrap gap-1">
                        </div>
                    </div>
                    
                    <!-- Choice Sources -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-green-300">Choice Sources</label>
                        <div class="relative">
                            <input type="text" class="choice-source-choices w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" 
                                   placeholder="Type choice text..." autocomplete="off">
                            <div class="choice-source-choices-dropdown absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-lg mt-1 max-h-32 overflow-y-auto hidden">
                            </div>
                        </div>
                        <div class="choice-source-choices-selected flex flex-wrap gap-1">
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Status Sources -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-cyan-300">Status Sources</label>
                        <div class="relative">
                            <input type="text" class="choice-source-status w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" 
                                   placeholder="Type status name..." autocomplete="off">
                            <div class="choice-source-status-dropdown absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-lg mt-1 max-h-32 overflow-y-auto hidden">
                            </div>
                        </div>
                        <div class="choice-source-status-selected flex flex-wrap gap-1">
                        </div>
                    </div>
                    
                    <!-- Item Sources -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-purple-300">Item Sources</label>
                        <div class="relative">
                            <input type="text" class="choice-source-items w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                                   placeholder="Type item name..." autocomplete="off">
                            <div class="choice-source-items-dropdown absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-lg mt-1 max-h-32 overflow-y-auto hidden">
                            </div>
                        </div>
                        <div class="choice-source-items-selected flex flex-wrap gap-1">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="bg-gray-600 rounded-lg p-4 border border-gray-500">
                <div class="flex justify-between items-center mb-3">
                    <h5 class="text-md font-medium text-yellow-400">Results</h5>
                    <button type="button" class="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="addResult(${choiceCounter})">+ Add Result</button>
                </div>
                <div class="space-y-2" id="results-${choiceCounter}">
                    <!-- Results will be added here -->
                </div>
            </div>
        </div>
    `;
    
    choicesContainer.appendChild(choiceDiv);
    
    // Initialize autocomplete for the new choice source inputs
    const eventInput = choiceDiv.querySelector('.choice-source-events');
    const choiceInput = choiceDiv.querySelector('.choice-source-choices');
    const statusInput = choiceDiv.querySelector('.choice-source-status');
    const itemInput = choiceDiv.querySelector('.choice-source-items');
    
    if (eventInput) initializeAutocompleteForElement(eventInput, allEvents, 'event');
    if (choiceInput) initializeAutocompleteForElement(choiceInput, allChoices, 'choice');
    if (statusInput) initializeAutocompleteForElement(statusInput, allStatus, 'status');
    if (itemInput) initializeAutocompleteForElement(itemInput, allItems, 'item');
    
    // Update reference lists when choice is added
    setTimeout(() => refreshReferenceLists(), 100);
}

function removeChoice(choiceId) {
    const choiceElement = document.querySelector(`[data-choice-id="${choiceId}"]`);
    if (choiceElement) {
        choiceElement.remove();
        // Update reference lists when choice is removed
        setTimeout(() => refreshReferenceLists(), 100);
    }
}

function toggleChoice(choiceId) {
    const choiceElement = document.querySelector(`[data-choice-id="${choiceId}"]`);
    if (!choiceElement) return;
    
    const content = choiceElement.querySelector('.choice-content');
    const icon = choiceElement.querySelector('.collapse-icon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        // Expand
        content.style.display = 'block';
        icon.textContent = '−';
        choiceElement.classList.remove('collapsed');
    } else {
        // Collapse
        content.style.display = 'none';
        icon.textContent = '+';
        choiceElement.classList.add('collapsed');
    }
}

function addResult(choiceId) {
    resultCounter++;
    const resultsContainer = document.getElementById(`results-${choiceId}`);
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-item flex gap-3 items-center bg-gray-500 p-3 rounded-lg';
    resultDiv.dataset.resultId = resultCounter;
    
    resultDiv.innerHTML = `
        <select class="result-attribute flex-1 px-3 py-2 bg-gray-400 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm" required>
            <option value="">Select Attribute</option>
            <option value="education">📚 Education</option>
            <option value="military">⚔️ Military</option>
            <option value="treasury">💰 Treasury</option>
            <option value="culture">🎨 Culture</option>
            <option value="approval">👍 Approval</option>
            <option value="nobles">👑 Nobles</option>
            <option value="diplomacy">🤝 Diplomacy</option>
        </select>
        <input type="number" class="result-change w-24 px-3 py-2 bg-gray-400 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm" placeholder="±" required>
        <button type="button" class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors duration-200" onclick="removeResult(${resultCounter})">×</button>
    `;
    
    resultsContainer.appendChild(resultDiv);
}

function removeResult(resultId) {
    const resultElement = document.querySelector(`[data-result-id="${resultId}"]`);
    if (resultElement) {
        resultElement.remove();
    }
}

// Event generation functions
function generateEventJsonSilent() {
    const eventTitle = document.getElementById('eventTitle').value;
    const eventDescription = document.getElementById('eventDescription').value;
    
    // Silent version - no error messages, just return null if incomplete
    if (!eventTitle || !eventDescription) {
        return null;
    }
    
    // Generate event object (same logic as generateEventJson)
    const event = {
        title: eventTitle,
        description: eventDescription,
        choices: []
    };
    
    // Get all choices
    const choiceElements = document.querySelectorAll('[id^="choice-"]');
    choiceElements.forEach(choiceElement => {
        const choiceId = choiceElement.id.replace('choice-', '');
        const choiceText = choiceElement.querySelector(`#choiceText-${choiceId}`).value;
        
        if (choiceText) {
            const choice = {
                text: choiceText,
                results: []
            };
            
            // Get dependent events
            const dependentEvents = choiceElement.querySelector(`#dependentEvents-${choiceId}`).value;
            if (dependentEvents) {
                choice.dependentEvents = dependentEvents.split(',').map(e => e.trim()).filter(e => e);
            }
            
            // Get dependent choices
            const dependentChoices = choiceElement.querySelector(`#dependentChoices-${choiceId}`).value;
            if (dependentChoices) {
                choice.dependentChoices = dependentChoices.split(',').map(c => c.trim()).filter(c => c);
            }
            
            // Get results
            const resultElements = choiceElement.querySelectorAll(`[id^="result-${choiceId}-"]`);
            resultElements.forEach(resultElement => {
                const resultType = resultElement.querySelector('select').value;
                const resultValue = resultElement.querySelector('input').value;
                
                if (resultType && resultValue) {
                    choice.results.push({
                        type: resultType,
                        value: resultValue
                    });
                }
            });
            
            event.choices.push(choice);
        }
    });
    
    return event;
}

function generateEventSources() {
    const sources = [];
    
    // Get event sources
    const eventIds = getSelectedValues('dependentEventIds');
    eventIds.forEach(id => {
        sources.push({
            type: "event",
            id: id
        });
    });
    
    // Get choice sources
    const choiceIds = getSelectedValues('dependentChoiceIds');
    choiceIds.forEach(id => {
        sources.push({
            type: "choice",
            id: id
        });
    });
    
    // Get status sources
    const statusIds = getSelectedValues('dependentStatusIds');
    statusIds.forEach(id => {
        sources.push({
            type: "status",
            id: id
        });
    });
    
    // Get item sources (from trigger items, moving to sources)
    const itemIds = getSelectedValues('triggerItems');
    itemIds.forEach(id => {
        sources.push({
            type: "item",
            id: id
        });
    });
    
    return sources;
}

// Helper functions for backward compatibility with old schema
function getEventDependencies(event) {
    // Handle new sources format
    if (event.sources) {
        const eventDeps = event.sources.filter(source => source.type === 'event').map(source => source.id);
        return eventDeps;
    }
    // Handle old format
    const oldDeps = event.dependentEventIds || [];
    return oldDeps;
}

function getChoiceDependencies(event) {
    // Handle new sources format
    if (event.sources) {
        return event.sources.filter(source => source.type === 'choice').map(source => source.id);
    }
    // Handle old format
    return event.dependentChoiceIds || [];
}

function getStatusDependencies(event) {
    // Handle new sources format
    if (event.sources) {
        return event.sources.filter(source => source.type === 'status').map(source => source.id);
    }
    // Handle old format
    return event.dependentStatusIds || [];
}

function getItemDependencies(event) {
    // Handle new sources format
    if (event.sources) {
        return event.sources.filter(source => source.type === 'item').map(source => source.id);
    }
    // Handle old format (from trigger.items)
    return (event.trigger && event.trigger.items) || [];
}

function generateChoiceSources(choiceItem) {
    const sources = [];
    
    // Get event sources for this choice
    const eventIds = getSelectedValuesFromElement(choiceItem.querySelector('.choice-source-events'));
    eventIds.forEach(id => {
        sources.push({
            type: "event",
            id: id
        });
    });
    
    // Get choice sources for this choice
    const choiceIds = getSelectedValuesFromElement(choiceItem.querySelector('.choice-source-choices'));
    choiceIds.forEach(id => {
        sources.push({
            type: "choice",
            id: id
        });
    });
    
    // Get status sources for this choice
    const statusIds = getSelectedValuesFromElement(choiceItem.querySelector('.choice-source-status'));
    statusIds.forEach(id => {
        sources.push({
            type: "status",
            id: id
        });
    });
    
    // Get item sources for this choice
    const itemIds = getSelectedValuesFromElement(choiceItem.querySelector('.choice-source-items'));
    itemIds.forEach(id => {
        sources.push({
            type: "item",
            id: id
        });
    });
    
    return sources;
}

function generateEventJson() {
    const eventTitle = document.getElementById('eventTitle').value;
    const eventDescription = document.getElementById('eventDescription').value;
    
    if (!eventTitle || !eventDescription) {
        showMessage('Please fill in event title and description', 'error');
        return null;
    }
    
    // Generate event object
    const event = {
        id: generateGuid(),
        title: eventTitle,
        description: eventDescription,
        choices: [],
        sources: generateEventSources(),
        trigger: generateTrigger()
    };
    
    // Add choices
    const choiceItems = document.querySelectorAll('.choice-item');
    choiceItems.forEach(choiceItem => {
        const choice = {
            id: generateGuid(),
            text: choiceItem.querySelector('.choice-text').value,
            sources: generateChoiceSources(choiceItem),
            results: []
        };
        
        // Add results for this choice
        const resultItems = choiceItem.querySelectorAll('.result-item');
        resultItems.forEach(resultItem => {
            const attribute = resultItem.querySelector('.result-attribute').value;
            const change = parseInt(resultItem.querySelector('.result-change').value);
            
            if (attribute && !isNaN(change)) {
                choice.results.push({
                    attribute: attribute,
                    change: change
                });
            }
        });
        
        if (choice.text) {
            event.choices.push(choice);
        }
    });
    
    return event;
}

function generateTrigger() {
    const trigger = {};
    
    const attributes = ['education', 'military', 'treasury', 'culture', 'approval', 'nobles', 'diplomacy'];
    
    attributes.forEach(attr => {
        const minValue = document.getElementById(`${attr}Min`).value;
        const maxValue = document.getElementById(`${attr}Max`).value;
        
        if (minValue !== '' || maxValue !== '') {
            trigger[attr] = {};
            if (minValue !== '') trigger[attr].min = parseInt(minValue);
            if (maxValue !== '') trigger[attr].max = parseInt(maxValue);
        }
    });
    
    // Items are now handled in the sources array, not in triggers
    
    return trigger;
}

function previewEvent() {
    const event = generateEventJson();
    if (event) {
        const jsonPreviewModal = document.getElementById('jsonPreviewModal');
        jsonPreviewModal.textContent = JSON.stringify(event, null, 2);
        currentEvent = event;
        
        // Update reference lists with current form data
        refreshReferenceLists();
        
        // Show the JSON modal
        showJsonModal();
        
        showMessage('JSON preview generated successfully!');
    }
}

function copyJsonToClipboard() {
    const jsonPreviewModal = document.getElementById('jsonPreviewModal');
    const text = jsonPreviewModal.textContent;
    
    if (text && text !== 'Click "Preview JSON" to see the generated event structure...') {
        navigator.clipboard.writeText(text).then(() => {
            showMessage('JSON copied to clipboard!');
        }).catch(() => {
            showMessage('Failed to copy JSON to clipboard', 'error');
        });
    } else {
        showMessage('No JSON to copy. Generate preview first.', 'error');
    }
}

// Local storage functions (fallback when Firebase is not configured)
function saveEventLocally(event) {
    const savedEvents = JSON.parse(localStorage.getItem('savedEvents') || '[]');
    savedEvents.push({
        ...event,
        savedAt: new Date().toISOString()
    });
    localStorage.setItem('savedEvents', JSON.stringify(savedEvents));
    
    // Update reference lists
    allEvents.push(event);
    event.choices.forEach(choice => {
        allChoices.push({
            ...choice,
            parentEventId: event.id,
            parentEventTitle: event.title
        });
    });
    updateReferenceLists();
    
    loadEvents();
    showMessage('Event saved locally!');
}

// Unified function to load events from the correct source
async function loadEvents() {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        try {
            await loadEventsFromFirebase();
            await loadItemsFromFirebase();
            await loadStatusFromFirebase();
            await loadEventIdeasFromFirebase();
        } catch (error) {
            console.error('Firebase loading failed, falling back to localStorage:', error);
            loadSavedEvents();
            loadItemsLocally();
            loadStatusLocally();
            loadEventIdeasLocally();
        }
    } else {
        loadSavedEvents();
        loadItemsLocally();
        loadStatusLocally();
        loadEventIdeasLocally();
    }
}


// Function to identify dependent events (events that are dependencies of other events)
function findDependentEvents(savedEvents) {
    const allEventIds = new Set(savedEvents.map(event => event.id));
    const dependentEventIds = new Set();
    
    // Collect all event IDs that are dependencies of other events
    savedEvents.forEach(event => {
        // Add direct event dependencies
        const eventDeps = getEventDependencies(event);
        eventDeps.forEach(depId => {
            if (allEventIds.has(depId)) {
                dependentEventIds.add(depId);
            }
        });
        
        // Add choice dependencies (events that contain dependent choices)
        const choiceDeps = getChoiceDependencies(event);
        choiceDeps.forEach(choiceId => {
            // Find which event contains this choice
            const parentEvent = savedEvents.find(e => 
                e.choices && e.choices.some(choice => choice.id === choiceId)
            );
            if (parentEvent) {
                dependentEventIds.add(parentEvent.id);
            }
        });
        
        // Add events referenced by choice dependencies
        if (event.choices) {
            event.choices.forEach(choice => {
                const choiceEventDeps = getEventDependencies(choice);
                choiceEventDeps.forEach(depId => {
                    if (allEventIds.has(depId)) {
                        dependentEventIds.add(depId);
                    }
                });
            });
        }
    });
    
    // Dependent events are those that ARE dependencies of other events
    return savedEvents.filter(event => dependentEventIds.has(event.id));
}

function loadSavedEvents() {
    const savedEvents = JSON.parse(localStorage.getItem('savedEvents') || '[]');
    
    // Update reference lists from saved events
    allEvents = savedEvents.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        choices: event.choices,
        dependentEventIds: event.dependentEventIds,
        dependentChoiceIds: event.dependentChoiceIds,
        trigger: event.trigger
    }));
    
    allChoices = [];
    savedEvents.forEach(event => {
        if (event.choices) {
            event.choices.forEach(choice => {
                allChoices.push({
                    ...choice,
                    parentEventId: event.id,
                    parentEventTitle: event.title
                });
            });
        }
    });
    
    updateReferenceLists();
    
    // Use unified display function
    displayEvents(savedEvents, 'localStorage');
}

// Unified function to display events with filtering support
function displayEvents(events, source = 'firebase') {
    const savedEventsList = document.getElementById('savedEventsList');
    savedEventsList.innerHTML = '';
    
    if (events.length === 0) {
        savedEventsList.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-400 text-lg">No saved events yet.</p><p class="text-gray-500 text-sm mt-2">Create and save your first event to see it here!</p></div>';
        return;
    }
    
    let eventsToShow, hiddenCount, infoCardConfig;
    
    if (showDependentEventsOnly) {
        // Show only dependent events
        const dependentEvents = findDependentEvents(events);
        eventsToShow = dependentEvents;
        hiddenCount = events.length - dependentEvents.length;
        
        if (dependentEvents.length === 0) {
            savedEventsList.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-400 text-lg">No dependent events found.</p><p class="text-gray-500 text-sm mt-2">All events are root events (independent).</p></div>';
            return;
        }
        
        infoCardConfig = {
            className: 'col-span-full bg-orange-900 bg-opacity-50 rounded-xl p-4 border border-orange-600 mb-4',
            icon: '🔗',
            textColor: 'text-orange-300',
            descColor: 'text-orange-200',
            showingText: `dependent event${dependentEvents.length !== 1 ? 's' : ''}`,
            hiddenText: `root event${hiddenCount !== 1 ? 's' : ''}`,
            description: 'Dependent events are used as dependencies by other events. Root events are accessible through the tree view.'
        };
    } else {
        // Show all events
        eventsToShow = events;
        hiddenCount = 0;
        infoCardConfig = null; // No info card needed for all events
    }
    
    // Add info about hidden events if any
    if (hiddenCount > 0 && infoCardConfig) {
        const infoCard = document.createElement('div');
        infoCard.className = infoCardConfig.className;
        infoCard.innerHTML = `
            <div class="flex items-center gap-2 ${infoCardConfig.textColor}">
                <span class="text-lg">${infoCardConfig.icon}</span>
                <span class="text-sm font-medium">
                    Showing ${eventsToShow.length} ${infoCardConfig.showingText} 
                    (${hiddenCount} ${infoCardConfig.hiddenText} hidden)
                </span>
            </div>
            <p class="${infoCardConfig.descColor} text-xs mt-1">${infoCardConfig.description}</p>
        `;
        savedEventsList.appendChild(infoCard);
    }
    
    // Display events with appropriate styling and functionality
    eventsToShow.forEach((event, index) => {
        const originalIndex = events.findIndex(e => e.id === event.id);
        // Find the index in allEvents array for tree functionality
        const allEventsIndex = allEvents.findIndex(e => e.id === event.id);
        const eventCard = document.createElement('div');
        const isFirebase = source === 'firebase';
        
        if (showDependentEventsOnly) {
            eventCard.className = 'bg-gray-700 rounded-xl p-6 border border-gray-600 hover:border-orange-500 transition-all duration-200 hover:shadow-lg';
            
            const savedDate = new Date(event.savedAt || event.createdAt || Date.now()).toLocaleDateString();
            
            // Find which events depend on this one (backward dependencies)
            const dependentOnThis = events.filter(e => {
                // Check direct dependencies
                if (e.dependentEventIds && e.dependentEventIds.includes(event.id)) return true;
                
                // Check choice dependencies
                if (e.choices) {
                    return e.choices.some(choice => 
                        choice.dependentEventIds && choice.dependentEventIds.includes(event.id)
                    );
                }
                
                // Check if this event contains choices that other events depend on
                if (e.dependentChoiceIds && event.choices) {
                    return event.choices.some(choice => e.dependentChoiceIds.includes(choice.id));
                }
                
                return false;
            });
            
            const loadFunction = isFirebase ? `loadFirebaseEventToForm('${event.id}')` : `loadEventToForm(${originalIndex})`;
            const deleteFunction = isFirebase ? `deleteFirebaseEvent('${event.firebaseKey}')` : `deleteEvent(${originalIndex})`;
            
            eventCard.innerHTML = `
                <h4 class="text-lg font-semibold text-orange-400 mb-3">${event.title || 'Untitled Event'}</h4>
                <p class="text-gray-300 text-sm mb-4 line-clamp-3">${(event.description || '').substring(0, 100)}${(event.description || '').length > 100 ? '...' : ''}</p>
                <p class="text-gray-500 text-xs mb-4">
                    Saved: ${savedDate} | Choices: ${event.choices ? event.choices.length : 0}
                    ${dependentOnThis.length > 0 ? ` | Used by: ${dependentOnThis.length} event${dependentOnThis.length !== 1 ? 's' : ''}` : ''}
                </p>
                <div class="flex gap-2 flex-wrap">
                    <button class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="${loadFunction}">Load</button>
                    <button class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="showEventTree(${allEventsIndex})">🌳 Tree</button>
                    <button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="${deleteFunction}">Delete</button>
                    <button class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="exportEvent(${originalIndex})">Export</button>
                </div>
            `;
        } else {
            // Show all events with original styling
            eventCard.className = 'bg-gray-700 rounded-xl p-6 border border-gray-600 hover:border-yellow-500 transition-all duration-200 hover:shadow-lg';
            
            const savedDate = new Date(event.savedAt || event.createdAt || Date.now()).toLocaleDateString();
            
            const loadFunction = isFirebase ? `loadFirebaseEventToForm('${event.id}')` : `loadEventToForm(${originalIndex})`;
            const deleteFunction = isFirebase ? `deleteFirebaseEvent('${event.firebaseKey}')` : `deleteEvent(${originalIndex})`;
            
            eventCard.innerHTML = `
                <h4 class="text-lg font-semibold text-yellow-400 mb-3">${event.title || 'Untitled Event'}</h4>
                <p class="text-gray-300 text-sm mb-4 line-clamp-3">${(event.description || '').substring(0, 100)}${(event.description || '').length > 100 ? '...' : ''}</p>
                <p class="text-gray-500 text-xs mb-4">Saved: ${savedDate} | Choices: ${event.choices ? event.choices.length : 0}</p>
                <div class="flex gap-2 flex-wrap">
                    <button class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="${loadFunction}">Load</button>
                    <button class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="showEventTree(${allEventsIndex})">🌳 Tree</button>
                    <button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="${deleteFunction}">Delete</button>
                    <button class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors duration-200" onclick="exportEvent(${originalIndex})">Export</button>
                </div>
            `;
        }
        
        savedEventsList.appendChild(eventCard);
    });
}

// Helper function to count nodes in a tree
function countNodesInTree(treeNode, visited = new Set()) {
    if (visited.has(treeNode.id)) return 0;
    visited.add(treeNode.id);
    
    let count = 1; // Count this node
    
    // Count children
    treeNode.children.forEach(child => {
        count += countNodesInTree(child, visited);
    });
    
    return count;
}

function loadEventToForm(index) {
    const savedEvents = JSON.parse(localStorage.getItem('savedEvents') || '[]');
    const event = savedEvents[index];
    
    if (!event) return;
    
    // Clear existing form
    clearForm();
    
    // Load basic event data
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDescription').value = event.description;
    setSelectedValues('dependentEventIds', event.dependentEventIds);
    setSelectedValues('dependentChoiceIds', event.dependentChoiceIds);
    setSelectedValues('dependentStatusIds', event.dependentStatusIds);
    
    // Load trigger data
    if (event.trigger) {
        const attributes = ['education', 'military', 'treasury', 'culture', 'approval', 'nobles', 'diplomacy'];
        attributes.forEach(attr => {
            if (event.trigger[attr]) {
                if (event.trigger[attr].min !== undefined) {
                    document.getElementById(`${attr}Min`).value = event.trigger[attr].min;
                }
                if (event.trigger[attr].max !== undefined) {
                    document.getElementById(`${attr}Max`).value = event.trigger[attr].max;
                }
            }
        });
        
        if (event.trigger.items) {
            setSelectedValues('triggerItems', event.trigger.items);
        }
    }
    
    // Load choices
    event.choices.forEach(choice => {
        addChoice();
        const choiceElements = document.querySelectorAll('.choice-item');
        const lastChoice = choiceElements[choiceElements.length - 1];
        
        lastChoice.querySelector('.choice-text').value = choice.text;
        // Load sources using backward compatibility helper functions
        const eventIds = getEventDependencies({sources: choice.sources, dependentEventIds: choice.dependentEventIds});
        const choiceIds = getChoiceDependencies({sources: choice.sources, dependentChoiceIds: choice.dependentChoiceIds});
        const statusIds = getStatusDependencies({sources: choice.sources, dependentStatusIds: choice.dependentStatusIds});
        const itemIds = getItemDependencies({sources: choice.sources, trigger: {items: choice.dependentItemIds}});
        
        // Set values for new source-based inputs
        setSelectedValuesFromElement(lastChoice.querySelector('.choice-source-events'), eventIds);
        setSelectedValuesFromElement(lastChoice.querySelector('.choice-source-choices'), choiceIds);
        setSelectedValuesFromElement(lastChoice.querySelector('.choice-source-status'), statusIds);
        setSelectedValuesFromElement(lastChoice.querySelector('.choice-source-items'), itemIds);
        
        // Backward compatibility for old class names
        setSelectedValuesFromElement(lastChoice.querySelector('.choice-dependent-events'), choice.dependentEventIds);
        setSelectedValuesFromElement(lastChoice.querySelector('.choice-dependent-choices'), choice.dependentChoiceIds);
        
        // Load results for this choice
        const choiceId = lastChoice.dataset.choiceId;
        choice.results.forEach(result => {
            addResult(choiceId);
            const resultElements = lastChoice.querySelectorAll('.result-item');
            const lastResult = resultElements[resultElements.length - 1];
            
            lastResult.querySelector('.result-attribute').value = result.attribute;
            lastResult.querySelector('.result-change').value = result.change;
        });
    });
    
    showMessage('Event loaded successfully!');
}

function deleteEvent(index) {
    if (confirm('Are you sure you want to delete this event?')) {
        const savedEvents = JSON.parse(localStorage.getItem('savedEvents') || '[]');
        savedEvents.splice(index, 1);
        localStorage.setItem('savedEvents', JSON.stringify(savedEvents));
        loadEvents();
        showMessage('Event deleted successfully!');
    }
}


// Function to collect all events in the dependency tree
function collectEventTree(rootEvent, allSavedEvents) {
    const collectedEvents = new Map();
    const eventMap = new Map();
    
    // Create a map of all events by ID for quick lookup
    allSavedEvents.forEach(event => {
        eventMap.set(event.id, event);
    });
    
    function collectDependencies(event, visited = new Set()) {
        if (visited.has(event.id)) {
            return; // Prevent infinite loops
        }
        visited.add(event.id);
        
        // Add current event to collection
        collectedEvents.set(event.id, event);
        
        // Collect forward dependencies (events this event depends on) - use helper for backward compatibility
        const eventDependencies = getEventDependencies(event);
        eventDependencies.forEach(depId => {
            const depEvent = eventMap.get(depId);
            if (depEvent && !visited.has(depId)) {
                collectDependencies(depEvent, visited);
            }
        });
        
        // Collect events that contain dependent choices - use helper for backward compatibility
        const choiceDependencies = getChoiceDependencies(event);
        choiceDependencies.forEach(choiceId => {
            const parentEvent = allSavedEvents.find(e => 
                e.choices && e.choices.some(choice => choice.id === choiceId)
            );
            if (parentEvent && !visited.has(parentEvent.id)) {
                collectDependencies(parentEvent, visited);
            }
        });
        
        // Collect dependencies from choices - use helper for backward compatibility
        if (event.choices) {
            event.choices.forEach(choice => {
                const choiceEventDeps = getEventDependencies(choice);
                choiceEventDeps.forEach(depId => {
                    const depEvent = eventMap.get(depId);
                    if (depEvent && !visited.has(depId)) {
                        collectDependencies(depEvent, visited);
                    }
                });
            });
        }
        
        // Collect backward dependencies (events that depend on this event)
        allSavedEvents.forEach(otherEvent => {
            if (otherEvent.id === event.id) return; // Skip self
            
            // Check if other event depends on current event - use helpers for backward compatibility
            let dependsOnCurrent = false;
            
            // Direct dependency
            const otherEventDeps = getEventDependencies(otherEvent);
            if (otherEventDeps.includes(event.id)) {
                dependsOnCurrent = true;
            }
            
            // Choice dependency
            if (otherEvent.choices) {
                otherEvent.choices.forEach(choice => {
                    const choiceEventDeps = getEventDependencies(choice);
                    if (choiceEventDeps.includes(event.id)) {
                        dependsOnCurrent = true;
                    }
                });
            }
            
            // Choice container dependency
            const otherChoiceDeps = getChoiceDependencies(otherEvent);
            if (event.choices) {
                event.choices.forEach(choice => {
                    if (otherChoiceDeps.includes(choice.id)) {
                        dependsOnCurrent = true;
                    }
                });
            }
            
            if (dependsOnCurrent && !visited.has(otherEvent.id)) {
                collectDependencies(otherEvent, visited);
            }
        });
    }
    
    // Start collection from root event
    collectDependencies(rootEvent);
    
    // Return array of collected events
    const result = Array.from(collectedEvents.values());
    return result;
}

function exportAllData() {
    const allData = {
        events: allEvents,
        choices: allChoices,
        items: getItemsList(),
        exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `patato_king_game_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessage('All game data exported successfully!');
}

// Item creation functions
function clearItemForm() {
    document.getElementById('itemName').value = '';
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemRarity').value = '';
    document.getElementById('itemImage').value = '';
    updateItemPreview();
    currentItem = null;
}

function updateItemPreview() {
    const name = document.getElementById('itemName').value;
    const description = document.getElementById('itemDescription').value;
    const price = document.getElementById('itemPrice').value;
    const rarity = document.getElementById('itemRarity').value;
    const image = document.getElementById('itemImage').value;
    
    const previewContainer = document.getElementById('itemPreview');
    
    if (!name && !description && !price && !rarity && !image) {
        previewContainer.innerHTML = '<div class="text-gray-400 text-sm">Fill in the form to see item preview...</div>';
        return;
    }
    
    const rarityNames = {
        '0': { name: 'Common', color: 'text-gray-300', emoji: '⚪' },
        '1': { name: 'Uncommon', color: 'text-green-300', emoji: '🟢' },
        '2': { name: 'Rare', color: 'text-blue-300', emoji: '🔵' },
        '3': { name: 'Epic', color: 'text-purple-300', emoji: '🟣' },
        '4': { name: 'Legendary', color: 'text-yellow-300', emoji: '🟡' }
    };
    
    const rarityInfo = rarityNames[rarity] || { name: 'Unknown', color: 'text-gray-300', emoji: '❓' };
    
    previewContainer.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <h5 class="text-lg font-semibold text-white">${name || 'Unnamed Item'}</h5>
                <div class="flex items-center gap-2">
                    <span class="${rarityInfo.color} text-sm font-medium">${rarityInfo.emoji} ${rarityInfo.name}</span>
                </div>
            </div>
            ${description ? `<p class="text-gray-300 text-sm">${description}</p>` : ''}
            <div class="flex items-center justify-between">
                <span class="text-yellow-400 font-medium">💰 ${price || '0'} coins</span>
                ${image ? `<span class="text-cyan-400 text-sm">🖼️ Has Image</span>` : ''}
            </div>
            ${image ? `<div class="mt-2"><img src="${image}" alt="${name}" class="w-16 h-16 object-cover rounded-lg border border-gray-500" onerror="this.style.display='none'"></div>` : ''}
        </div>
    `;
}

function generateItemJson() {
    const name = document.getElementById('itemName').value;
    const description = document.getElementById('itemDescription').value;
    const price = document.getElementById('itemPrice').value;
    const rarity = document.getElementById('itemRarity').value;
    const image = document.getElementById('itemImage').value;
    
    if (!name || !description || !price || !rarity) {
        showMessage('Please fill in all required fields (name, description, price, rarity)', 'error');
        return null;
    }
    
    const item = {
        item: {
            id: generateGuid(),
            name: name,
            description: description,
            price: parseInt(price),
            image: image || "",
            rarity: rarity
        }
    };
    
    return item;
}

function generateItem() {
    const item = generateItemJson();
    
    if (item) {
        currentItem = item;
        
        // Show the JSON in console for debugging
        
        // Update preview with the generated item
        updateItemPreview();
        
        
        // Try Firebase first, fallback to local storage
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            saveItemToFirebase(item.item);
        } else {
            // Automatically add to items list locally
            allItems.push(item.item);
            updateItemsDisplay();
            showMessage(`Item "${item.item.name}" generated and added to list!`);
        }
        
        // Close the modal after successful generation
        hideItemModal();
    }
}

function copyItemJson() {
    const item = currentItem || generateItemJson();
    if (item) {
        const jsonString = JSON.stringify(item, null, 2);
        navigator.clipboard.writeText(jsonString).then(() => {
            showMessage('Item JSON copied to clipboard!');
        }).catch(() => {
            showMessage('Failed to copy JSON to clipboard', 'error');
        });
    }
}

function addItemToList() {
    const item = currentItem || generateItemJson();
    
    if (item) {
        
        // Try Firebase first, fallback to local storage
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            saveItemToFirebase(item.item);
        } else {
            // Add to allItems array locally
            allItems.push(item.item);
            updateItemsDisplay();
            showMessage(`Item "${item.item.name}" added to items list!`);
        }
        
        hideItemModal();
    }
}

function updateItemsDisplay() {
    const itemsGrid = document.getElementById('itemsGrid');
    
    if (allItems.length === 0) {
        itemsGrid.innerHTML = `
            <div class="text-gray-400 text-sm text-center col-span-full py-8">
                No items created yet. Click "Create Item" to add your first item!
            </div>
        `;
        return;
    }
    
    const rarityInfo = {
        '0': { name: 'Common', color: 'text-gray-300', bgColor: 'bg-gray-600', emoji: '⚪' },
        '1': { name: 'Uncommon', color: 'text-green-300', bgColor: 'bg-green-900', emoji: '🟢' },
        '2': { name: 'Rare', color: 'text-blue-300', bgColor: 'bg-blue-900', emoji: '🔵' },
        '3': { name: 'Epic', color: 'text-purple-300', bgColor: 'bg-purple-900', emoji: '🟣' },
        '4': { name: 'Legendary', color: 'text-yellow-300', bgColor: 'bg-yellow-900', emoji: '🟡' }
    };
    
    itemsGrid.innerHTML = allItems.map((item, index) => {
        const rarity = rarityInfo[item.rarity] || rarityInfo['0'];
        return `
            <div class="item-card group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border-2 ${rarity.bgColor.replace('bg-', 'border-')} hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-${rarity.bgColor.split('-')[1]}-500/20">
                <!-- Rarity Glow Effect -->
                <div class="absolute inset-0 rounded-xl ${rarity.bgColor} opacity-5 group-hover:opacity-10 transition-opacity duration-300"></div>
                
                <!-- Header with Name, Rarity, and Remove Button -->
                <div class="relative flex items-start justify-between mb-4">
                    <div class="flex-1 pr-2">
                        <h5 class="text-white font-bold text-lg mb-2 leading-tight" title="${item.name}">
                            ${item.name}
                        </h5>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="${rarity.color} text-sm font-bold px-3 py-1 bg-black/30 rounded-full border border-current/20 backdrop-blur-sm">
                            ${rarity.emoji} ${rarity.name}
                        </span>
                        <button onclick="removeItem(${index})" class="w-8 h-8 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 rounded-full text-lg font-bold transition-all duration-200 hover:scale-110" title="Remove item">
                            ×
                        </button>
                    </div>
                </div>
                
                <!-- Description -->
                <div class="relative mb-4">
                    <p class="text-gray-300 text-sm leading-relaxed min-h-[2.5rem]" title="${item.description}">
                        ${item.description}
                    </p>
                </div>
                
                <!-- Price and Image Indicator -->
                <div class="relative flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <span class="text-yellow-400 text-lg font-bold flex items-center gap-1">
                            <span class="text-xl">💰</span>
                            ${item.price.toLocaleString()}
                        </span>
                    </div>
                    ${item.image ? `
                        <div class="flex items-center gap-1 text-cyan-400 text-sm font-medium bg-cyan-500/10 px-2 py-1 rounded-full border border-cyan-500/20">
                            <span>🖼️</span>
                            <span>Image</span>
                        </div>
                    ` : ''}
                </div>
                
                <!-- ID Section -->
                <div class="relative pt-3 border-t border-gray-600/50">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="text-gray-500 text-xs font-medium mb-1">Item ID</div>
                            <div class="text-gray-300 text-xs font-mono bg-black/20 px-2 py-1 rounded border border-gray-600/30 break-all">
                                ${item.id}
                            </div>
                        </div>
                        <button onclick="copyItemId('${item.id}')" class="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 hover:text-blue-300 rounded-lg transition-all duration-200 hover:scale-110 group" title="Copy ID">
                            <span class="text-lg group-hover:scale-110 transition-transform duration-200">📋</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function removeItem(index) {
    const item = allItems[index];
    if (confirm(`Are you sure you want to remove "${item.name}"?`)) {
        // Try Firebase first, fallback to local storage
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            deleteFirebaseItem(item.firebaseKey || item.id);
        } else {
            // Remove locally
            allItems.splice(index, 1);
            updateItemsDisplay();
            showMessage(`Item "${item.name}" removed from list!`);
        }
    }
}

function copyItemId(itemId) {
    navigator.clipboard.writeText(itemId).then(() => {
        showMessage('Item ID copied to clipboard!');
    }).catch(() => {
        showMessage('Failed to copy item ID', 'error');
    });
}

function getItemsList() {
    // Return array of item IDs for compatibility with existing code
    return allItems.map(item => item.id);
}

// Tree visualization functions
function showEventTree(eventIndex) {
    // Use the window function to maintain consistency
    window.showEventTree(eventIndex);
}

function buildEventTree(rootEvent, allSavedEvents, options = { showForward: true, showBackward: true, includeChoices: true }) {
    const visited = new Set();
    const eventMap = new Map();
    const choiceMap = new Map();
    
    // Create maps of all events and choices by ID
    allSavedEvents.forEach(event => {
        eventMap.set(event.id, event);
        if (event.choices) {
            event.choices.forEach(choice => {
                choiceMap.set(choice.id, { ...choice, parentEventId: event.id, parentEventTitle: event.title });
            });
        }
    });
    
    // Find events that depend on a given event (backward dependencies)
    function findBackwardDependencies(targetEventId) {
        const backwardDeps = [];
        allSavedEvents.forEach(event => {
            // Check if this event depends on the target event - use helper for backward compatibility
            const eventDeps = getEventDependencies(event);
            if (eventDeps.includes(targetEventId)) {
                backwardDeps.push(event);
            }
            // Check if any of this event's choices depend on the target event
            if (event.choices && options.includeChoices) {
                event.choices.forEach(choice => {
                    const choiceEventDeps = getEventDependencies(choice);
                    if (choiceEventDeps.includes(targetEventId)) {
                        backwardDeps.push({
                            ...event,
                            isChoiceDependency: true,
                            choiceText: choice.text,
                            choiceId: choice.id
                        });
                    }
                });
            }
        });
        return backwardDeps;
    }
    
    // Find choices that depend on a given event
    function findChoiceDependencies(targetEventId) {
        const choiceDeps = [];
        allSavedEvents.forEach(event => {
            if (event.choices) {
                event.choices.forEach(choice => {
                    if (choice.dependentEventIds && choice.dependentEventIds.includes(targetEventId)) {
                        choiceDeps.push({
                            id: choice.id,
                            title: `Choice: ${choice.text}`,
                            description: `From event: ${event.title}`,
                            parentEventId: event.id,
                            parentEventTitle: event.title,
                            isChoice: true
                        });
                    }
                });
            }
        });
        return choiceDeps;
    }
    
    // Find events that contain specific choice IDs
    function findEventsContainingChoices(choiceIds) {
        const eventsWithChoices = [];
        choiceIds.forEach(choiceId => {
            allSavedEvents.forEach(event => {
                if (event.choices) {
                    const foundChoice = event.choices.find(choice => choice.id === choiceId);
                    if (foundChoice) {
                        eventsWithChoices.push({
                            ...event,
                            isChoiceContainer: true,
                            containedChoiceId: choiceId,
                            containedChoiceText: foundChoice.text
                        });
                    }
                }
            });
        });
        return eventsWithChoices;
    }
    
    function buildNode(event, depth = 0, direction = 'forward') {
        const nodeKey = `${event.id}-${direction}-${depth}`;
        if (visited.has(nodeKey) || depth > 4) { // Prevent infinite loops and limit depth
            return {
                id: event.id,
                title: event.title,
                children: [],
                parents: [],
                isCircular: visited.has(nodeKey),
                direction: direction
            };
        }
        
        visited.add(nodeKey);
        
        const node = {
            id: event.id,
            title: event.title,
            description: event.description,
            children: [],
            parents: [],
            isCircular: false,
            direction: direction,
            isChoiceDependency: event.isChoiceDependency || false,
            choiceText: event.choiceText || null,
            choiceId: event.choiceId || null,
            isChoice: event.isChoice || false,
            parentEventId: event.parentEventId || null,
            parentEventTitle: event.parentEventTitle || null,
            isChoiceContainer: event.isChoiceContainer || false,
            containedChoiceId: event.containedChoiceId || null,
            containedChoiceText: event.containedChoiceText || null
        };
        
        // Add forward dependencies (events this event depends on) - use helper for backward compatibility
        const eventDeps = getEventDependencies(event);
        if (options.showForward && eventDeps.length > 0) {
            eventDeps.forEach(depId => {
                const depEvent = eventMap.get(depId);
                if (depEvent) {
                    node.children.push(buildNode(depEvent, depth + 1, 'forward'));
                }
            });
        }
        
        // Add events that contain dependent choices - use helper for backward compatibility
        const choiceDeps = getChoiceDependencies(event);
        if (options.showForward && choiceDeps.length > 0) {
            const eventsWithChoices = findEventsContainingChoices(choiceDeps);
            eventsWithChoices.forEach(choiceEvent => {
                // Only add if this event isn't already in the tree at this level
                const existingChild = node.children.find(child => child.id === choiceEvent.id);
                if (!existingChild) {
                    node.children.push(buildNode(choiceEvent, depth + 1, 'choice-container'));
                }
            });
        }
        
        // Add status dependencies - use helper for backward compatibility
        const statusDeps = getStatusDependencies(event);
        if (options.showForward && statusDeps.length > 0) {
            statusDeps.forEach(statusId => {
                const status = allStatus.find(s => s.id === statusId);
                if (status) {
                    // Only add if this status isn't already in the tree at this level
                    const existingChild = node.children.find(child => child.id === status.id && child.isStatus);
                    if (!existingChild) {
                        node.children.push({
                            id: status.id,
                            title: status.name,
                            description: `Status: ${status.name}`,
                            children: [],
                            parents: [],
                            isCircular: false,
                            direction: 'forward',
                            isStatus: true,
                            statusData: status
                        });
                    }
                }
            });
        }
        
        // Add item dependencies - use helper for backward compatibility
        const itemDeps = getItemDependencies(event);
        if (options.showForward && itemDeps.length > 0) {
            itemDeps.forEach(itemId => {
                const item = allItems.find(i => i.id === itemId);
                if (item) {
                    // Only add if this item isn't already in the tree at this level
                    const existingChild = node.children.find(child => child.id === item.id && child.isItem);
                    if (!existingChild) {
                        node.children.push({
                            id: item.id,
                            title: item.name,
                            description: `Item: ${item.name}`,
                            children: [],
                            parents: [],
                            isCircular: false,
                            direction: 'forward',
                            isItem: true,
                            itemData: item
                        });
                    }
                }
            });
        }
        
        // Add backward dependencies (events that depend on this event)
        if (options.showBackward && direction !== 'backward') {
            const backwardDeps = findBackwardDependencies(event.id);
            backwardDeps.forEach(depEvent => {
                node.parents.push(buildNode(depEvent, depth + 1, 'backward'));
            });
        }
        
        // Add choice dependencies if enabled
        if (options.includeChoices && direction !== 'choice') {
            const choiceDeps = findChoiceDependencies(event.id);
            choiceDeps.forEach(choiceDep => {
                node.parents.push(buildNode(choiceDep, depth + 1, 'choice'));
            });
        }
        
        visited.delete(nodeKey); // Allow the same event in different branches
        return node;
    }
    
    return buildNode(rootEvent);
}

function generateTreeSVG(treeData, rootTitle) {
    const nodeWidth = 200;
    const nodeHeight = 80;
    const levelHeight = 120;
    const nodeSpacing = 20;
    
    // Calculate tree dimensions with both parents and children
    const levels = [];
    const rootLevel = 3; // Place root in the middle
    
    function calculateLevels(node, level = rootLevel, visited = new Set()) {
        const nodeKey = `${node.id}-${level}`;
        if (visited.has(nodeKey)) return;
        visited.add(nodeKey);
        
        if (!levels[level]) levels[level] = [];
        levels[level].push(node);
        
        // Add children (forward dependencies) above root (reversed)
        node.children.forEach(child => {
            calculateLevels(child, level - 1, visited);
        });
        
        // Add parents (backward dependencies) below root (reversed)
        node.parents.forEach(parent => {
            calculateLevels(parent, level + 1, visited);
        });
    }
    
    calculateLevels(treeData);
    
    // For now, allow duplicate status/item nodes to ensure all connections are visible
    // TODO: Implement proper deduplication that preserves all connection lines
    
    // Remove empty levels and adjust indices
    const compactLevels = levels.filter(level => level && level.length > 0);
    const maxWidth = Math.max(...compactLevels.map(level => level.length)) * (nodeWidth + nodeSpacing);
    const legendHeight = 170; // Increased for status and item legend entries
    const totalHeight = compactLevels.length * levelHeight + 60 + legendHeight;
    
    let svg = `<svg width="${Math.max(1000, maxWidth)}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add background
    svg += `<rect width="100%" height="100%" fill="#111827"/>`;
    
    // Add title
    svg += `<text x="${Math.max(1000, maxWidth) / 2}" y="30" text-anchor="middle" fill="#f3f4f6" font-size="20" font-weight="bold">Complete Dependency Tree: ${rootTitle}</text>`;
    
    // Position nodes
    const nodePositions = new Map();
    
    compactLevels.forEach((level, levelIndex) => {
        const levelWidth = level.length * (nodeWidth + nodeSpacing) - nodeSpacing;
        const startX = (Math.max(1000, maxWidth) - levelWidth) / 2;
        
        level.forEach((node, nodeIndex) => {
            const x = startX + nodeIndex * (nodeWidth + nodeSpacing);
            const y = 60 + levelIndex * levelHeight;
            nodePositions.set(`${node.id}-${levelIndex}`, { x, y, node });
        });
    });
    
    // Draw connections
    function drawConnections(node, currentLevel) {
        const parentPos = nodePositions.get(`${node.id}-${currentLevel}`);
        
        // Draw connections to children (upward in reversed layout)
        node.children.forEach(child => {
            const childPos = nodePositions.get(`${child.id}-${currentLevel - 1}`);
            if (parentPos && childPos) {
                const startX = parentPos.x + nodeWidth / 2;
                const startY = parentPos.y; // Start from top of parent node
                const endX = childPos.x + nodeWidth / 2;
                const endY = childPos.y + nodeHeight; // End at bottom of child node
                
                // Draw line with different colors for different types
                const strokeColor = child.isChoice ? '#10b981' : '#6b7280';
                svg += `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${strokeColor}" stroke-width="2"/>`;
                
                // Draw arrow pointing upward
                const arrowSize = 8;
                svg += `<polygon points="${endX},${endY} ${endX - arrowSize},${endY + arrowSize} ${endX + arrowSize},${endY + arrowSize}" fill="${strokeColor}"/>`;
            }
        });
        
        // Draw connections to parents (downward in reversed layout)
        node.parents.forEach(parent => {
            const parentNodePos = nodePositions.get(`${parent.id}-${currentLevel + 1}`);
            if (parentPos && parentNodePos) {
                const startX = parentPos.x + nodeWidth / 2;
                const startY = parentPos.y + nodeHeight; // Start from bottom of current node
                const endX = parentNodePos.x + nodeWidth / 2;
                const endY = parentNodePos.y; // End at top of parent node
                
                // Draw line with different colors for different types
                const strokeColor = parent.isChoice ? '#10b981' : (parent.isChoiceDependency ? '#f59e0b' : '#ef4444');
                svg += `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="${parent.isChoiceDependency ? '5,5' : 'none'}"/>`;
                
                // Draw arrow pointing downward
                const arrowSize = 8;
                svg += `<polygon points="${endX},${endY} ${endX - arrowSize},${endY - arrowSize} ${endX + arrowSize},${endY - arrowSize}" fill="${strokeColor}"/>`;
            }
        });
    }
    
    // Draw all connections
    compactLevels.forEach((level, levelIndex) => {
        level.forEach(node => {
            drawConnections(node, levelIndex);
        });
    });
    
    // Draw nodes
    compactLevels.forEach((level, levelIndex) => {
        level.forEach(node => {
            const pos = nodePositions.get(`${node.id}-${levelIndex}`);
            if (!pos) return;
            
            const isRoot = node.id === treeData.id;
            const isCircular = node.isCircular;
            const isChoice = node.isChoice;
            const isChoiceDependency = node.isChoiceDependency;
            const isChoiceContainer = node.isChoiceContainer;
            const isStatus = node.isStatus;
            const isItem = node.isItem;
            const isBackward = node.direction === 'backward';
            
            let fillColor, strokeColor;
            if (isRoot) {
                fillColor = '#7c3aed';
                strokeColor = '#8b5cf6';
            } else if (isCircular) {
                fillColor = '#dc2626';
                strokeColor = '#ef4444';
            } else if (isStatus) {
                fillColor = '#0891b2';
                strokeColor = '#06b6d4';
            } else if (isItem) {
                fillColor = '#ea580c';
                strokeColor = '#f97316';
            } else if (isChoice) {
                fillColor = '#059669';
                strokeColor = '#10b981';
            } else if (isChoiceDependency) {
                fillColor = '#d97706';
                strokeColor = '#f59e0b';
            } else if (isChoiceContainer) {
                fillColor = '#0891b2';
                strokeColor = '#0284c7';
            } else if (isBackward) {
                fillColor = '#dc2626';
                strokeColor = '#ef4444';
            } else {
                fillColor = '#374151';
                strokeColor = '#6b7280';
            }
            
            // Draw node rectangle
            svg += `<rect x="${pos.x}" y="${pos.y}" width="${nodeWidth}" height="${nodeHeight}" 
                    fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" rx="8"/>`;
            
            // Add title text
            let title = node.title;
            if (isChoiceDependency && node.choiceText) {
                title = `${node.title} (via: ${node.choiceText.substring(0, 15)}...)`;
            } else if (isChoiceContainer && node.containedChoiceText) {
                title = `${node.title} (has: ${node.containedChoiceText.substring(0, 15)}...)`;
            }
            title = title.length > 25 ? title.substring(0, 22) + '...' : title;
            svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 20}" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${title}</text>`;
            
            // Add description or special indicators
            if (isCircular) {
                svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 40}" text-anchor="middle" fill="#fca5a5" font-size="10">Circular Reference</text>`;
            } else if (isStatus) {
                svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 40}" text-anchor="middle" fill="#cffafe" font-size="10">Status Requirement</text>`;
            } else if (isItem) {
                svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 40}" text-anchor="middle" fill="#fed7aa" font-size="10">Item Requirement</text>`;
            } else if (isChoice) {
                svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 40}" text-anchor="middle" fill="#d1fae5" font-size="10">Choice Dependency</text>`;
            } else if (isChoiceDependency) {
                svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 40}" text-anchor="middle" fill="#fef3c7" font-size="10">Via Choice</text>`;
            } else if (isChoiceContainer) {
                svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 40}" text-anchor="middle" fill="#cffafe" font-size="10">Contains Choice</text>`;
            } else if (node.description) {
                const desc = node.description.length > 30 ? node.description.substring(0, 27) + '...' : node.description;
                svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 40}" text-anchor="middle" fill="#d1d5db" font-size="10">${desc}</text>`;
            }
            
            // Add dependency count
            const totalDeps = node.children.length + node.parents.length;
            if (totalDeps > 0) {
                svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 60}" text-anchor="middle" fill="#9ca3af" font-size="9">${node.children.length}↓ ${node.parents.length}↑</text>`;
            }
            
            // Add direction indicator
            if (isRoot) {
                svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 75}" text-anchor="middle" fill="#c4b5fd" font-size="9">ROOT</text>`;
            } else if (isBackward) {
                svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + 75}" text-anchor="middle" fill="#fca5a5" font-size="9">DEPENDS ON ROOT</text>`;
            }
        });
    });
    
    // Add enhanced legend with proper spacing
    const legendY = totalHeight - legendHeight + 20;
    const legendWidth = Math.min(600, Math.max(1000, maxWidth) - 40);
    svg += `<rect x="20" y="${legendY}" width="${legendWidth}" height="${legendHeight - 40}" fill="#1f2937" stroke="#374151" stroke-width="1" rx="4"/>`;
    svg += `<text x="30" y="${legendY + 20}" fill="#f3f4f6" font-size="14" font-weight="bold">Legend:</text>`;
    
    // First row
    // Root event
    svg += `<rect x="30" y="${legendY + 30}" width="15" height="15" fill="#7c3aed" rx="2"/>`;
    svg += `<text x="50" y="${legendY + 42}" fill="#d1d5db" font-size="11">Root Event</text>`;
    
    // Forward dependency
    svg += `<rect x="140" y="${legendY + 30}" width="15" height="15" fill="#374151" rx="2"/>`;
    svg += `<text x="160" y="${legendY + 42}" fill="#d1d5db" font-size="11">Forward Dependency</text>`;
    
    // Backward dependency
    svg += `<rect x="290" y="${legendY + 30}" width="15" height="15" fill="#dc2626" rx="2"/>`;
    svg += `<text x="310" y="${legendY + 42}" fill="#d1d5db" font-size="11">Backward Dependency</text>`;
    
    // Choice container
    svg += `<rect x="430" y="${legendY + 30}" width="15" height="15" fill="#0891b2" rx="2"/>`;
    svg += `<text x="450" y="${legendY + 42}" fill="#d1d5db" font-size="11">Contains Choice</text>`;
    
    // Second row
    // Choice dependency
    svg += `<rect x="30" y="${legendY + 55}" width="15" height="15" fill="#059669" rx="2"/>`;
    svg += `<text x="50" y="${legendY + 67}" fill="#d1d5db" font-size="11">Choice Dependency</text>`;
    
    // Choice-mediated dependency
    svg += `<rect x="180" y="${legendY + 55}" width="15" height="15" fill="#d97706" rx="2"/>`;
    svg += `<text x="200" y="${legendY + 67}" fill="#d1d5db" font-size="11">Via Choice</text>`;
    
    // Circular reference
    svg += `<rect x="290" y="${legendY + 55}" width="15" height="15" fill="#dc2626" rx="2"/>`;
    svg += `<text x="310" y="${legendY + 67}" fill="#d1d5db" font-size="11">Circular Reference</text>`;
    
    // Third row - Status and Item requirements
    // Status requirement
    svg += `<rect x="30" y="${legendY + 80}" width="15" height="15" fill="#0891b2" rx="2"/>`;
    svg += `<text x="50" y="${legendY + 92}" fill="#d1d5db" font-size="11">Status Requirement</text>`;
    
    // Item requirement
    svg += `<rect x="180" y="${legendY + 80}" width="15" height="15" fill="#ea580c" rx="2"/>`;
    svg += `<text x="200" y="${legendY + 92}" fill="#d1d5db" font-size="11">Item Requirement</text>`;
    
    // Direction indicators
    svg += `<text x="30" y="${legendY + 110}" fill="#9ca3af" font-size="10">Arrows: ↑ Forward deps, ↓ Backward deps (Reversed Layout)</text>`;
    
    svg += '</svg>';
    
    return svg;
}

function hideTreeModal() {
    const modal = document.getElementById('treeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none'; // Fallback
    }
}

function downloadTreeSVG() {
    const treeContainer = document.getElementById('treeContainer');
    const svgElement = treeContainer.querySelector('svg');
    
    if (!svgElement) {
        showMessage('No tree to download', 'error');
        return;
    }
    
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `event_tree_${new Date().toISOString().split('T')[0]}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessage('Tree SVG downloaded successfully!');
}

function saveEvent() {
    const event = generateEventJson();
    if (event) {
        // Try Firebase first, fallback to localStorage
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                saveEventToFirebase(event);
        } else {
            saveEventLocally(event);
        }
    }
}

function clearForm() {
    // Clear basic fields
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDescription').value = '';
    document.getElementById('dependentEventIds').value = '';
    document.getElementById('dependentChoiceIds').value = '';
    document.getElementById('dependentStatusIds').value = '';
    
    // Clear trigger fields
    const attributes = ['education', 'military', 'treasury', 'culture', 'approval', 'nobles', 'diplomacy'];
    attributes.forEach(attr => {
        document.getElementById(`${attr}Min`).value = '';
        document.getElementById(`${attr}Max`).value = '';
    });
    document.getElementById('triggerItems').value = '';
    
    // Clear choices
    document.getElementById('choicesContainer').innerHTML = '';
    
    // Clear preview
    document.getElementById('jsonPreviewModal').textContent = 'Click "Preview JSON" to see the generated event structure...';
    
    // Reset counters
    choiceCounter = 0;
    resultCounter = 0;
    currentEvent = null;
    
    showMessage('Form cleared successfully!');
}

// Modal functions
function showLoadModal() {
    const modal = document.getElementById('loadModal');
    const eventsList = document.getElementById('eventsList');
    
    const savedEvents = JSON.parse(localStorage.getItem('savedEvents') || '[]');
    
    eventsList.innerHTML = '';
    
    if (savedEvents.length === 0) {
        eventsList.innerHTML = '<div class="text-center py-8"><p class="text-gray-400">No saved events to load.</p></div>';
    } else {
        savedEvents.forEach((event, index) => {
            const eventItem = document.createElement('div');
            eventItem.className = 'bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 cursor-pointer transition-all duration-200 hover:shadow-md';
            eventItem.onclick = () => {
                loadEventToForm(index);
                hideLoadModal();
            };
            
            const savedDate = new Date(event.savedAt).toLocaleDateString();
            
            eventItem.innerHTML = `
                <h4 class="text-md font-semibold text-blue-400 mb-2">${event.title}</h4>
                <p class="text-gray-300 text-sm mb-2">${event.description.substring(0, 80)}${event.description.length > 80 ? '...' : ''}</p>
                <div class="text-gray-400 text-xs font-mono mb-2 break-all">${event.id}</div>
                <p class="text-gray-500 text-xs">Saved: ${savedDate} | Choices: ${event.choices.length}</p>
            `;
            
            eventsList.appendChild(eventItem);
        });
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function hideLoadModal() {
    const modal = document.getElementById('loadModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Button event listeners
    document.getElementById('addChoice').addEventListener('click', addChoice);
    document.getElementById('previewEvent').addEventListener('click', previewEvent);
    document.getElementById('copyJsonModal').addEventListener('click', copyJsonToClipboard);
    document.getElementById('saveEvent').addEventListener('click', saveEvent);
    document.getElementById('loadEvent').addEventListener('click', showLoadModal);
    document.getElementById('clearForm').addEventListener('click', clearForm);
    document.getElementById('refreshLists').addEventListener('click', refreshReferenceLists);
    document.getElementById('exportLists').addEventListener('click', exportAllData);
    document.getElementById('collapseAll').addEventListener('click', collapseAllChoices);
    document.getElementById('expandAll').addEventListener('click', expandAllChoices);
    
    // Item modal event listeners
    document.getElementById('createItemBtn').addEventListener('click', showItemModal);
    document.getElementById('generateItemBtn').addEventListener('click', generateItem);
    document.getElementById('copyItemBtn').addEventListener('click', copyItemJson);
    
    // Item form input listeners for live preview
    document.getElementById('itemName').addEventListener('input', updateItemPreview);
    document.getElementById('itemDescription').addEventListener('input', updateItemPreview);
    document.getElementById('itemPrice').addEventListener('input', updateItemPreview);
    document.getElementById('itemRarity').addEventListener('change', updateItemPreview);
    document.getElementById('itemImage').addEventListener('input', updateItemPreview);
    
    // Status modal event listeners
    document.getElementById('createStatusBtn').addEventListener('click', showStatusModal);
    document.getElementById('generateStatusBtn').addEventListener('click', generateStatus);
    document.getElementById('copyStatusBtn').addEventListener('click', copyStatusJson);
    
    // Event Ideas modal event listeners
    document.getElementById('createEventIdeaBtn').addEventListener('click', showEventIdeaModal);
    document.getElementById('generateEventIdeaBtn').addEventListener('click', generateEventIdea);
    document.getElementById('copyEventIdeaBtn').addEventListener('click', copyEventIdeaJson);
    
    // Event Ideas form input listeners for live preview
    document.getElementById('eventIdeaName').addEventListener('input', updateEventIdeaPreview);
    document.getElementById('eventIdeaDescription').addEventListener('input', updateEventIdeaPreview);
    // addPrerequisiteBtn removed - now using static prerequisite inputs
    
    // Status form input listeners for live preview
    document.getElementById('statusName').addEventListener('input', updateStatusPreview);
    
    // Modal event listeners
    document.querySelector('.close').addEventListener('click', hideLoadModal);
    
    // Tree modal event listeners
    const closeTreeBtn = document.querySelector('.close-tree');
    if (closeTreeBtn) {
        closeTreeBtn.addEventListener('click', hideTreeModal);
    }
    
    const downloadBtn = document.getElementById('downloadTreeSvg');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadTreeSVG);
    }
    
    // Tree control event listeners
    const showBothBtn = document.getElementById('showBothBtn');
    if (showBothBtn) {
        showBothBtn.addEventListener('click', () => setTreeView(true, true));
    }
    
    const showForwardBtn = document.getElementById('showForwardBtn');
    if (showForwardBtn) {
        showForwardBtn.addEventListener('click', () => setTreeView(true, false));
    }
    
    const showBackwardBtn = document.getElementById('showBackwardBtn');
    if (showBackwardBtn) {
        showBackwardBtn.addEventListener('click', () => setTreeView(false, true));
    }
    
    const includeChoicesCheckbox = document.getElementById('includeChoicesCheckbox');
    if (includeChoicesCheckbox) {
        includeChoicesCheckbox.addEventListener('change', toggleChoiceInclusion);
    }
    
    const refreshTreeBtn = document.getElementById('refreshTreeBtn');
    if (refreshTreeBtn) {
        refreshTreeBtn.addEventListener('click', refreshTree);
    }
    
    // Event filter button listeners
    const showAllEventsBtn = document.getElementById('showAllEventsBtn');
    if (showAllEventsBtn) {
        showAllEventsBtn.addEventListener('click', showAllEvents);
    }
    
    const showDependentEventsBtnElement = document.getElementById('showDependentEventsBtn');
    if (showDependentEventsBtnElement) {
        showDependentEventsBtnElement.addEventListener('click', showDependentEventsOnlyFilter);
    }
    
    // Click outside modal to close
    window.addEventListener('click', function(event) {
        const loadModal = document.getElementById('loadModal');
        const treeModal = document.getElementById('treeModal');
        const itemModal = document.getElementById('itemModal');
        const statusModal = document.getElementById('statusModal');
        const eventIdeaModal = document.getElementById('eventIdeaModal');
        
        if (event.target === loadModal) {
            hideLoadModal();
        }
        if (event.target === treeModal) {
            hideTreeModal();
        }
        if (event.target === itemModal) {
            hideItemModal();
        }
        if (event.target === statusModal) {
            hideStatusModal();
        }
        if (event.target === eventIdeaModal) {
            hideEventIdeaModal();
        }
    });
    
    // ESC key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            hideLoadModal();
            hideTreeModal();
            hideItemModal();
            hideStatusModal();
            hideEventIdeaModal();
        }
    });
    
    // Load saved events on page load
    loadEvents();
    
    // Initialize event filter buttons
    updateEventFilterButtons();
    
    // Initialize items display
    updateItemsDisplay();
    
    // Initialize event ideas display
    updateEventIdeasDisplay();
    
    // Add initial choice
    addChoice();
    
    // Add event listeners for form changes to update reference lists
    document.getElementById('eventTitle').addEventListener('input', () => {
        setTimeout(() => refreshReferenceLists(), 300);
    });
    
});


// Firebase functions (to be implemented when Firebase is configured)
async function saveEventToFirebase(event) {
    try {
        const eventData = {
            ...event,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            savedAt: new Date().toISOString()
        };
        
        // Save to the events collection with auto-generated key
        const eventsRef = database.ref('events');
        const eventRef = eventsRef.push();
        await eventRef.set(eventData);
        
        showMessage('Event saved to Firebase!');
        
        // Wait a moment for the data to be set, then reload
        setTimeout(() => {
            loadEventsFromFirebase();
        }, 1000);
    } catch (error) {
        console.error('Error saving event to Firebase: ', error);
        
        if (error.code === 'PERMISSION_DENIED') {
            showMessage('Firebase permission denied - check database rules', 'error');
        } else if (error.code === 'NETWORK_ERROR') {
            showMessage('Firebase network error - saving locally instead', 'error');
        } else {
            showMessage(`Firebase error: ${error.message} - saving locally`, 'error');
        }
        
        // Fallback to local storage
        saveEventLocally(event);
    }
}

async function loadEventsFromFirebase() {
    try {
        // Get reference to events collection
        const eventsRef = database.ref('events');
        
        // Get the data once
        const snapshot = await eventsRef.once('value');
        
        const events = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Convert the object to an array
            Object.keys(data).forEach(key => {
                const event = data[key];
                
                // Skip test connection entries
                if (key === 'test_connection') return;
                
                // Add Firebase key as firebaseKey for reference, keep original event ID
                const loadedEvent = {
                    ...event,
                    firebaseKey: key, // Store the Firebase auto-generated key for deletion
                    // Convert Firebase timestamp to readable format if needed
                    savedAt: event.savedAt || new Date(event.createdAt || Date.now()).toISOString()
                };
                
                events.push(loadedEvent);
            });
            
            // Sort events by createdAt (most recent first)
            events.sort((a, b) => {
                const aTime = new Date(a.createdAt || a.savedAt || 0).getTime();
                const bTime = new Date(b.createdAt || b.savedAt || 0).getTime();
                return bTime - aTime;
            });
        }
        
        // Update reference lists with Firebase data
        allEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            description: event.description,
            choices: event.choices || [],
            sources: event.sources || [], 
            trigger: event.trigger || {}
        }));
        
        allChoices = [];
        events.forEach(event => {
            if (event.choices) {
                event.choices.forEach(choice => {
                    allChoices.push({
                        ...choice,
                        parentEventId: event.id,
                        parentEventTitle: event.title
                    });
                });
            }
        });
        
        updateReferenceLists();
        
        // Display Firebase events with the same filtering logic as localStorage
        displayEvents(events);
        
    } catch (error) {
        console.error('Error loading events from Firebase: ', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'PERMISSION_DENIED') {
            showMessage('Firebase permission denied - check database rules', 'error');
        } else if (error.code === 'NETWORK_ERROR') {
            showMessage('Firebase network error - check internet connection', 'error');
        } else {
            showMessage(`Firebase error: ${error.message}`, 'error');
        }
        
        // Fallback to local storage
        loadSavedEvents();
    }
}

// Firebase event management functions
function loadFirebaseEventToForm(eventId) {
    // Find the event in allEvents (which now contains Firebase data)
    const event = allEvents.find(e => e.id === eventId);
    if (!event) {
        showMessage('Event not found', 'error');
        return;
    }
    
    // Use the existing loadEventToForm logic but with Firebase event
    clearForm();
    
    // Load basic event data
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDescription').value = event.description;
    setSelectedValues('dependentEventIds', event.dependentEventIds);
    setSelectedValues('dependentChoiceIds', event.dependentChoiceIds);
    setSelectedValues('dependentStatusIds', event.dependentStatusIds);
    
    // Load trigger data
    if (event.trigger) {
        const attributes = ['education', 'military', 'treasury', 'culture', 'approval', 'nobles', 'diplomacy'];
        attributes.forEach(attr => {
            if (event.trigger[attr]) {
                if (event.trigger[attr].min !== undefined) {
                    document.getElementById(`${attr}Min`).value = event.trigger[attr].min;
                }
                if (event.trigger[attr].max !== undefined) {
                    document.getElementById(`${attr}Max`).value = event.trigger[attr].max;
                }
            }
        });
        
        if (event.trigger.items) {
            setSelectedValues('triggerItems', event.trigger.items);
        }
    }
    
    // Load choices
    if (event.choices) {
        event.choices.forEach(choice => {
            addChoice();
            const choiceElements = document.querySelectorAll('.choice-item');
            const lastChoice = choiceElements[choiceElements.length - 1];
            
            lastChoice.querySelector('.choice-text').value = choice.text;
            // Load sources using backward compatibility helper functions
            const eventIds = getEventDependencies({sources: choice.sources, dependentEventIds: choice.dependentEventIds});
            const choiceIds = getChoiceDependencies({sources: choice.sources, dependentChoiceIds: choice.dependentChoiceIds});
            const statusIds = getStatusDependencies({sources: choice.sources, dependentStatusIds: choice.dependentStatusIds});
            const itemIds = getItemDependencies({sources: choice.sources, trigger: {items: choice.dependentItemIds}});
            
            // Set values for new source-based inputs
            setSelectedValuesFromElement(lastChoice.querySelector('.choice-source-events'), eventIds);
            setSelectedValuesFromElement(lastChoice.querySelector('.choice-source-choices'), choiceIds);
            setSelectedValuesFromElement(lastChoice.querySelector('.choice-source-status'), statusIds);
            setSelectedValuesFromElement(lastChoice.querySelector('.choice-source-items'), itemIds);
            
            // Backward compatibility for old class names
            setSelectedValuesFromElement(lastChoice.querySelector('.choice-dependent-events'), choice.dependentEventIds);
            setSelectedValuesFromElement(lastChoice.querySelector('.choice-dependent-choices'), choice.dependentChoiceIds);
            
            // Load results for this choice
            const choiceId = lastChoice.dataset.choiceId;
            if (choice.results) {
                choice.results.forEach(result => {
                    addResult(choiceId);
                    const resultElements = lastChoice.querySelectorAll('.result-item');
                    const lastResult = resultElements[resultElements.length - 1];
                    
                    lastResult.querySelector('.result-attribute').value = result.attribute;
                    lastResult.querySelector('.result-change').value = result.change;
                });
            }
        });
    }
    
    showMessage('Event loaded from Firebase!');
}

async function deleteFirebaseEvent(firebaseKey) {
    if (confirm('Are you sure you want to delete this event from Firebase?')) {
        try {
            // Use the Firebase auto-generated key to delete from events collection
            const eventRef = database.ref(`events/${firebaseKey}`);
            
            // Check if the event exists first
            const snapshot = await eventRef.once('value');
            if (!snapshot.exists()) {
                showMessage('Event not found in Firebase', 'error');
                return;
            }
            
            // Perform the delete operation
            await eventRef.remove();
            
            showMessage('Event deleted from Firebase!');
            
            // Wait a moment then reload
            setTimeout(() => {
                loadEventsFromFirebase();
            }, 500);
            
        } catch (error) {
            console.error('Error deleting event:', error);
            
            if (error.code === 'PERMISSION_DENIED') {
                showMessage('Permission denied - check Firebase database rules', 'error');
            } else if (error.code === 'NETWORK_ERROR') {
                showMessage('Network error - check your internet connection', 'error');
            } else if (error.code === 'UNAVAILABLE') {
                showMessage('Firebase service temporarily unavailable', 'error');
            } else {
                showMessage(`Firebase delete error: ${error.message || 'Unknown error'}`, 'error');
            }
        }
    }
}

// Firebase functions for items
async function saveItemToFirebase(item) {
    try {
  
        
        const itemData = {
            ...item,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            savedAt: new Date().toISOString()
        };
        
        
        // Save to the items collection with auto-generated key
        const itemsRef = database.ref('items');
        const itemRef = itemsRef.push();
        
        
        const result = await itemRef.set(itemData);
        
        // Verify the item was actually saved
        const verification = await itemRef.once('value');
  
     
        showMessage(`Item "${item.name}" saved to Firebase!`);
        
        // Wait a moment for the data to be set, then reload
        setTimeout(() => {
            loadItemsFromFirebase();
        }, 1000);
    } catch (error) {
        console.error('Error saving item to Firebase: ', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        if (error.code === 'PERMISSION_DENIED') {
            showMessage('Firebase permission denied - check database rules', 'error');
        } else if (error.code === 'NETWORK_ERROR') {
            showMessage('Firebase network error - saving locally instead', 'error');
        } else {
            showMessage(`Firebase error: ${error.message} - saving locally`, 'error');
        }
        
        // Fallback to local storage
        allItems.push(item);
        updateItemsDisplay();
        showMessage(`Item "${item.name}" added to local list!`);
    }
}

async function loadItemsFromFirebase() {
    try {
  
        
        // Get reference to items collection
        const itemsRef = database.ref('items');
        
        // Get the data once
        const snapshot = await itemsRef.once('value');
        
  
        
        const items = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
    
            
            // Convert the object to an array
            Object.keys(data).forEach(key => {
                const item = data[key];
          
                
                // Add Firebase key as firebaseKey for reference, keep original item ID
                items.push({
                    ...item,
                    firebaseKey: key, // Store the Firebase auto-generated key for deletion
                    // Convert Firebase timestamp to readable format if needed
                    savedAt: item.savedAt || new Date(item.createdAt || Date.now()).toISOString()
                });
            });
            
            // Sort items by createdAt (most recent first)
            items.sort((a, b) => {
                const aTime = new Date(a.createdAt || a.savedAt || 0).getTime();
                const bTime = new Date(b.createdAt || b.savedAt || 0).getTime();
                return bTime - aTime;
            });
        } 
        
  
        
        // Update allItems with Firebase data
        allItems = items;
        updateItemsDisplay();
        updateReferenceLists(); // Update dependency selects with new items
        
   
        
    } catch (error) {
        console.error('Error loading items from Firebase: ', error);
        
        if (error.code === 'PERMISSION_DENIED') {
            showMessage('Firebase permission denied for items - check database rules', 'error');
        } else if (error.code === 'NETWORK_ERROR') {
            showMessage('Firebase network error for items - check internet connection', 'error');
        } else {
            showMessage(`Firebase items error: ${error.message}`, 'error');
        }
        
        // Fallback to local storage
        loadItemsLocally();
    }
}

async function deleteFirebaseItem(firebaseKey) {
    if (confirm('Are you sure you want to delete this item from Firebase?')) {
        try {
            // Use the Firebase auto-generated key to delete from items collection
            const itemRef = database.ref(`items/${firebaseKey}`);
            
            // Check if the item exists first
            const snapshot = await itemRef.once('value');
            if (!snapshot.exists()) {
                showMessage('Item not found in Firebase', 'error');
                return;
            }
            
            const itemData = snapshot.val();
            
            // Perform the delete operation
            await itemRef.remove();
            
            showMessage(`Item "${itemData.name}" deleted from Firebase!`);
            
            // Wait a moment then reload
            setTimeout(() => {
                loadItemsFromFirebase();
            }, 500);
            
        } catch (error) {
            console.error('Error deleting item:', error);
            
            if (error.code === 'PERMISSION_DENIED') {
                showMessage('Permission denied - check Firebase database rules', 'error');
            } else if (error.code === 'NETWORK_ERROR') {
                showMessage('Network error - check your internet connection', 'error');
            } else if (error.code === 'UNAVAILABLE') {
                showMessage('Firebase service temporarily unavailable', 'error');
            } else {
                showMessage(`Firebase delete error: ${error.message || 'Unknown error'}`, 'error');
            }
        }
    }
}

function loadItemsLocally() {
    // For now, items are only stored in memory locally
    // You could extend this to use localStorage if needed
    updateItemsDisplay();
}

// Status Firebase Functions
async function saveStatusToFirebase(status) {
    try {
        const statusData = {
            ...status,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            savedAt: new Date().toISOString()
        };
        
        // Save to the status collection with auto-generated key
        const statusRef = database.ref('status');
        const statusItemRef = statusRef.push();
        
        const result = await statusItemRef.set(statusData);
        
        // Verify the status was actually saved
        const verification = await statusItemRef.once('value');
        
        showMessage(`Status "${status.name}" saved to Firebase!`);
        
        // Wait a moment for the data to be set, then reload
        setTimeout(() => {
            loadStatusFromFirebase();
        }, 1000);
    } catch (error) {
        console.error('Error saving status to Firebase: ', error);
        
        if (error.code === 'PERMISSION_DENIED') {
            showMessage('Permission denied - check Firebase database rules', 'error');
        } else if (error.code === 'NETWORK_ERROR') {
            showMessage('Network error - check your internet connection', 'error');
        } else if (error.code === 'UNAVAILABLE') {
            showMessage('Firebase service temporarily unavailable', 'error');
        } else {
            showMessage(`Firebase save error: ${error.message || 'Unknown error'}`, 'error');
        }
    }
}

async function loadStatusFromFirebase() {
    try {
        // Get reference to status collection
        const statusRef = database.ref('status');
        
        // Get the data once
        const snapshot = await statusRef.once('value');
        
        const statusList = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Convert Firebase object to array
            Object.keys(data).forEach(key => {
                const statusItem = data[key];
                statusItem.firebaseKey = key; // Store Firebase key for deletion
                statusList.push(statusItem);
            });
            
            // Sort by creation time (newest first)
            statusList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        
        // Update global status array
        allStatus = statusList;
        
        // Update display
        updateStatusDisplay();
        
        // Update dependency selects to include loaded status
        updateDependencySelects();
        
        // Update reference lists to include loaded status
        updateReferenceLists();
        
        
    } catch (error) {
        console.error('Error loading status from Firebase: ', error);
        
        if (error.code === 'PERMISSION_DENIED') {
            showMessage('Permission denied - check Firebase database rules', 'error');
        } else if (error.code === 'NETWORK_ERROR') {
            showMessage('Network error - check your internet connection', 'error');
        } else if (error.code === 'UNAVAILABLE') {
            showMessage('Firebase service temporarily unavailable', 'error');
        } else {
            showMessage(`Firebase load error: ${error.message || 'Unknown error'}`, 'error');
        }
        
        // Fallback to local storage or empty array
        loadStatusLocally();
    }
}

async function deleteFirebaseStatus(firebaseKey) {
    if (!firebaseKey) {
        console.error('No Firebase key provided for status deletion');
        return;
    }
    
    try {
        const statusRef = database.ref(`status/${firebaseKey}`);
        await statusRef.remove();
        
        showMessage('Status deleted from Firebase!', 'success');
        
        // Reload status after deletion
        setTimeout(() => {
            loadStatusFromFirebase();
        }, 500);
        
    } catch (error) {
        console.error('Error deleting status:', error);
        
        if (error.code === 'PERMISSION_DENIED') {
            showMessage('Permission denied - check Firebase database rules', 'error');
        } else if (error.code === 'NETWORK_ERROR') {
            showMessage('Network error - check your internet connection', 'error');
        } else if (error.code === 'UNAVAILABLE') {
            showMessage('Firebase service temporarily unavailable', 'error');
        } else {
            showMessage(`Firebase delete error: ${error.message || 'Unknown error'}`, 'error');
        }
    }
}

function loadStatusLocally() {
    // For now, status are only stored in memory locally
    // You could extend this to use localStorage if needed
    updateStatusDisplay();
    updateReferenceLists();
}

// Status Management Functions
function clearStatusForm() {
    document.getElementById('statusName').value = '';
    
    // Clear selected sources
    const eventSelected = document.getElementById('statusEventSources-selected');
    const choiceSelected = document.getElementById('statusChoiceSources-selected');
    const itemSelected = document.getElementById('statusItemSources-selected');
    
    if (eventSelected) eventSelected.innerHTML = '';
    if (choiceSelected) choiceSelected.innerHTML = '';
    if (itemSelected) itemSelected.innerHTML = '';
    
    // Clear prerequisite inputs
    const prerequisiteInputs = document.querySelectorAll('#prerequisitesContainer input[data-attribute]');
    prerequisiteInputs.forEach(input => {
        input.value = '';
    });
    
    updateStatusPreview();
}

function updateStatusPreview() {
    const statusName = document.getElementById('statusName').value;
    const preview = document.getElementById('statusPreview');
    
    if (!preview) return;
    
    if (!statusName.trim()) {
        preview.innerHTML = '<div class="text-gray-400 text-sm">Fill in the form to see status preview...</div>';
        return;
    }
    
    const statusObj = generateStatusJson();
    
    preview.innerHTML = `
        <div class="bg-cyan-600 text-white p-3 rounded-lg border border-cyan-500">
            <div class="flex items-center justify-between mb-2">
                <h5 class="font-semibold text-sm flex items-center">
                    <span class="mr-2">🏆</span>${statusObj.name}
                </h5>
                <span class="text-xs bg-cyan-700 px-2 py-1 rounded">${statusObj.id}</span>
            </div>
            <div class="text-xs space-y-1">
                <div><strong>Prerequisites:</strong> ${Object.keys(statusObj.Prerequisites).length > 0 ? 
                    Object.entries(statusObj.Prerequisites).map(([attr, values]) => {
                        const minMax = [];
                        if (values.min !== undefined) minMax.push(`min: ${values.min}`);
                        if (values.max !== undefined) minMax.push(`max: ${values.max}`);
                        return `${attr} (${minMax.join(', ')})`;
                    }).join(', ') 
                    : 'None'}</div>
                <div><strong>Optional Sources:</strong> ${statusObj.optionalSources.length} source(s)</div>
            </div>
        </div>
    `;
}

function generateStatusJson() {
    const statusName = document.getElementById('statusName').value;
    
    // Generate GUID
    const statusId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    
    // Collect optional sources
    const optionalSources = [];
    
    // Event sources
    const eventSelected = document.getElementById('statusEventSources-selected');
    if (eventSelected) {
        const eventBadges = eventSelected.querySelectorAll('div[data-item-id]');
        eventBadges.forEach(badge => {
            optionalSources.push({
                type: "event",
                id: badge.getAttribute('data-item-id')
            });
        });
    }
    
    // Choice sources
    const choiceSelected = document.getElementById('statusChoiceSources-selected');
    if (choiceSelected) {
        const choiceBadges = choiceSelected.querySelectorAll('div[data-item-id]');
        choiceBadges.forEach(badge => {
            optionalSources.push({
                type: "choice",
                id: badge.getAttribute('data-item-id')
            });
        });
    }
    
    // Item sources
    const itemSelected = document.getElementById('statusItemSources-selected');
    if (itemSelected) {
        const itemBadges = itemSelected.querySelectorAll('div[data-item-id]');
        itemBadges.forEach(badge => {
            optionalSources.push({
                type: "item",
                id: badge.getAttribute('data-item-id')
            });
        });
    }
    
    // Collect prerequisites - single object instead of array
    const prerequisites = {};
    
    // Get all attribute inputs from the prerequisites container
    const allAttributeInputs = document.querySelectorAll('#prerequisitesContainer input[data-attribute]');
    allAttributeInputs.forEach(input => {
        const attribute = input.getAttribute('data-attribute');
        const type = input.getAttribute('data-type');
        const value = input.value;
        
        if (value !== '') {
            if (!prerequisites[attribute]) {
                prerequisites[attribute] = {};
            }
            prerequisites[attribute][type] = parseInt(value);
        }
    });
    
    return {
        id: statusId,
        name: statusName,
        Prerequisites: prerequisites,
        optionalSources: optionalSources
    };
}

function generateStatus() {
    const statusName = document.getElementById('statusName').value;
    
    if (!statusName.trim()) {
        showMessage('Please enter a status name', 'error');
        return;
    }
    
    const statusObj = generateStatusJson();
    
    // Try to save to Firebase first, fallback to local storage
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        saveStatusToFirebase(statusObj);
    } else {
        addStatusToList(statusObj);
        showMessage('Status created successfully! (Saved locally)', 'success');
    }
    
    hideStatusModal();
}

function copyStatusJson() {
    const statusObj = generateStatusJson();
    const jsonString = JSON.stringify(statusObj, null, 2);
    
    navigator.clipboard.writeText(jsonString).then(() => {
        showMessage('Status JSON copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showMessage('Failed to copy JSON to clipboard', 'error');
    });
}

function addStatusToList(statusObj) {
    allStatus.push(statusObj);
    updateStatusDisplay();
    updateDependencySelects(); // Update autocomplete with new status
    updateReferenceLists(); // Update reference lists with new status
}

function updateStatusDisplay() {
    const statusGrid = document.getElementById('statusGrid');
    if (!statusGrid) return;
    
    if (allStatus.length === 0) {
        statusGrid.innerHTML = '<div class="text-gray-400 text-sm text-center col-span-full py-8">No status created yet. Click "Create Status" to add your first status!</div>';
        return;
    }
    
    statusGrid.innerHTML = allStatus.map((status, index) => `
        <div class="bg-gray-600 rounded-lg p-4 border border-gray-500 hover:border-cyan-400 transition-colors">
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-cyan-300 flex items-center text-sm">
                    <span class="mr-2">🏆</span>${status.name}
                </h4>
                <div class="flex gap-1">
                    <button onclick="copyStatusId('${status.id}')" 
                        class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                        title="Copy ID">📋</button>
                    <button onclick="removeStatus(${index})" 
                        class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                        title="Delete">🗑️</button>
                </div>
            </div>
            <div class="text-xs text-gray-300 space-y-1">
                <div><strong>ID:</strong> <span class="font-mono text-xs">${status.id}</span></div>
                <div><strong>Prerequisites:</strong> ${Object.keys(status.Prerequisites || {}).length} attribute(s)</div>
                <div><strong>Optional Sources:</strong> ${status.optionalSources.length} source(s)</div>
            </div>
        </div>
    `).join('');
}

function removeStatus(index) {
    if (confirm('Are you sure you want to delete this status?')) {
        const status = allStatus[index];
        
        // If status has Firebase key, delete from Firebase
        if (status.firebaseKey) {
            deleteFirebaseStatus(status.firebaseKey);
        } else {
            // Local deletion
            allStatus.splice(index, 1);
            updateStatusDisplay();
            showMessage('Status deleted successfully!', 'success');
        }
    }
}

function copyStatusId(statusId) {
    navigator.clipboard.writeText(statusId).then(() => {
        showMessage('Status ID copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showMessage('Failed to copy ID to clipboard', 'error');
    });
}

// addPrerequisite and removePrerequisite functions removed - now using static prerequisite inputs

function getStatusList() {
    return allStatus.map(status => ({
        id: status.id,
        name: status.name
    }));
}

// Event Ideas Functions
let currentEventIdea = null;
let allEventIdeas = [];

window.showEventIdeaModal = function() {
    const modal = document.getElementById('eventIdeaModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
        clearEventIdeaForm();
    }
};

window.hideEventIdeaModal = function() {
    const modal = document.getElementById('eventIdeaModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
    }
};

window.toggleEventIdeasContainer = function() {
    const content = document.querySelector('.event-ideas-content');
    const icon = content?.parentElement.querySelector('.collapse-icon');
    
    if (!content || !icon) return;
    
    if (content.style.display === 'none') {
        // Expand
        content.style.display = 'block';
        icon.textContent = '−';
    } else {
        // Collapse
        content.style.display = 'none';
        icon.textContent = '+';
    }
};

function clearEventIdeaForm() {
    document.getElementById('eventIdeaName').value = '';
    document.getElementById('eventIdeaDescription').value = '';
    updateEventIdeaPreview();
}

function updateEventIdeaPreview() {
    const name = document.getElementById('eventIdeaName').value;
    const description = document.getElementById('eventIdeaDescription').value;
    
    const preview = document.getElementById('eventIdeaPreview');
    
    if (!name.trim() && !description.trim()) {
        preview.innerHTML = '<div class="text-gray-400 text-sm">Fill in the form to see event idea preview...</div>';
        return;
    }
    
    preview.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-4 border border-gray-600">
            <div class="flex items-center justify-between mb-3">
                <h4 class="text-lg font-semibold text-green-300 flex items-center">
                    <span class="mr-2">💡</span>${name || 'Event Idea Name'}
                </h4>
            </div>
            <p class="text-gray-300 text-sm leading-relaxed">
                ${description || 'Event idea description...'}
            </p>
        </div>
    `;
}

function generateEventIdeaJson() {
    const name = document.getElementById('eventIdeaName').value;
    const description = document.getElementById('eventIdeaDescription').value;
    
    if (!name.trim()) {
        showMessage('Please enter an event idea name', 'error');
        return null;
    }
    
    if (!description.trim()) {
        showMessage('Please enter an event idea description', 'error');
        return null;
    }
    
    // Generate GUID
    const eventIdeaId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    
    const eventIdea = {
        id: eventIdeaId,
        name: name.trim(),
        description: description.trim()
    };
    
    return eventIdea;
}

function generateEventIdea() {
    const eventIdea = generateEventIdeaJson();
    
    if (eventIdea) {
        currentEventIdea = eventIdea;
        
        // Try Firebase first, fallback to local storage
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            saveEventIdeaToFirebase(eventIdea);
        } else {
            // Automatically add to event ideas list locally
            allEventIdeas.push(eventIdea);
            updateEventIdeasDisplay();
            saveEventIdeasLocally();
            showMessage(`Event idea "${eventIdea.name}" generated and added to list!`);
        }
        
        // Close the modal after successful generation
        hideEventIdeaModal();
    }
}

function copyEventIdeaJson() {
    const eventIdea = currentEventIdea || generateEventIdeaJson();
    
    if (eventIdea) {
        navigator.clipboard.writeText(JSON.stringify(eventIdea, null, 2)).then(() => {
            showMessage('Event idea JSON copied to clipboard!');
        });
    }
}

function updateEventIdeasDisplay() {
    const eventIdeasGrid = document.getElementById('eventIdeasGrid');
    
    if (!eventIdeasGrid) return;
    
    if (allEventIdeas.length === 0) {
        eventIdeasGrid.innerHTML = `
            <div class="text-gray-400 text-sm text-center col-span-full py-8">
                No event ideas created yet. Click "Create Event Idea" to add your first idea!
            </div>
        `;
        return;
    }
    
    eventIdeasGrid.innerHTML = allEventIdeas.map((eventIdea, index) => `
        <div class="bg-gray-600 rounded-lg p-4 border border-gray-500 hover:border-green-400 transition-colors">
            <div class="flex items-center justify-between mb-3">
                <h4 class="text-lg font-semibold text-green-300 flex items-center truncate">
                    <span class="mr-2">💡</span>
                    <span class="truncate">${eventIdea.name}</span>
                </h4>
                <div class="flex gap-1 ml-2">
                    <button onclick="copyEventIdeaId('${eventIdea.id}')" 
                        class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                        title="Copy ID">
                        📋
                    </button>
                    <button onclick="removeEventIdea(${index})" 
                        class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                        title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
            <p class="text-gray-300 text-sm leading-relaxed line-clamp-3">
                ${eventIdea.description}
            </p>
        </div>
    `).join('');
}

function removeEventIdea(index) {
    if (confirm('Are you sure you want to delete this event idea?')) {
        const eventIdea = allEventIdeas[index];
        
        // If event idea has Firebase key, delete from Firebase
        if (eventIdea.firebaseKey) {
            deleteFirebaseEventIdea(eventIdea.firebaseKey);
        } else {
            // Local deletion
            allEventIdeas.splice(index, 1);
            updateEventIdeasDisplay();
            saveEventIdeasLocally();
            showMessage('Event idea deleted successfully!', 'success');
        }
    }
}

function copyEventIdeaId(eventIdeaId) {
    navigator.clipboard.writeText(eventIdeaId).then(() => {
        showMessage('Event idea ID copied to clipboard!');
    }).catch(() => {
        showMessage('Failed to copy ID to clipboard', 'error');
    });
}

function getEventIdeasList() {
    return allEventIdeas.map(eventIdea => ({
        id: eventIdea.id,
        name: eventIdea.name,
        description: eventIdea.description
    }));
}

// Firebase functions for event ideas
async function saveEventIdeaToFirebase(eventIdea) {
    try {
        const eventIdeaData = {
            ...eventIdea,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            savedAt: new Date().toISOString()
        };
        
        // Save to the event_ideas collection with auto-generated key
        const eventIdeasRef = database.ref('event_ideas');
        const eventIdeaRef = eventIdeasRef.push();
        
        const result = await eventIdeaRef.set(eventIdeaData);
        
        // Verify the event idea was actually saved
        const verification = await eventIdeaRef.once('value');
        
        showMessage(`Event idea "${eventIdea.name}" saved to Firebase!`);
        
        // Wait a moment for the data to be set, then reload
        setTimeout(() => {
            loadEventIdeasFromFirebase();
        }, 1000);
    } catch (error) {
        console.error('Error saving event idea to Firebase: ', error);
        
        if (error.code === 'PERMISSION_DENIED') {
            showMessage('Permission denied - check Firebase database rules', 'error');
        } else if (error.code === 'NETWORK_ERROR') {
            showMessage('Network error - check your internet connection', 'error');
        } else if (error.code === 'UNAVAILABLE') {
            showMessage('Firebase service temporarily unavailable', 'error');
        } else {
            showMessage(`Firebase save error: ${error.message || 'Unknown error'}`, 'error');
        }
        
        // Fallback to local storage
        allEventIdeas.push(eventIdea);
        updateEventIdeasDisplay();
        showMessage(`Event idea "${eventIdea.name}" added to local list!`);
    }
}

async function loadEventIdeasFromFirebase() {
    try {
        // Get reference to event_ideas collection
        const eventIdeasRef = database.ref('event_ideas');
        
        // Get the data once
        const snapshot = await eventIdeasRef.once('value');
        
        const eventIdeas = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Convert the object to an array
            Object.keys(data).forEach(key => {
                const eventIdea = data[key];
                
                // Add Firebase key as firebaseKey for reference, keep original event idea ID
                eventIdeas.push({
                    ...eventIdea,
                    firebaseKey: key, // Store the Firebase auto-generated key for deletion
                    // Convert Firebase timestamp to readable format if needed
                    savedAt: eventIdea.savedAt || new Date(eventIdea.createdAt || Date.now()).toISOString()
                });
            });
            
            // Sort event ideas by createdAt (most recent first)
            eventIdeas.sort((a, b) => {
                const aTime = new Date(a.createdAt || a.savedAt || 0).getTime();
                const bTime = new Date(b.createdAt || b.savedAt || 0).getTime();
                return bTime - aTime;
            });
        }
        
        // Update allEventIdeas with Firebase data
        allEventIdeas = eventIdeas;
        updateEventIdeasDisplay();
        
    } catch (error) {
        console.error('Error loading event ideas from Firebase: ', error);
        showMessage('Failed to load event ideas from Firebase - using local data', 'error');
    }
}

async function deleteFirebaseEventIdea(firebaseKey) {
    try {
        const eventIdeaRef = database.ref(`event_ideas/${firebaseKey}`);
        await eventIdeaRef.remove();
        
        showMessage('Event idea deleted from Firebase!');
        
        // Reload event ideas from Firebase
        setTimeout(() => {
            loadEventIdeasFromFirebase();
        }, 500);
    } catch (error) {
        console.error('Error deleting event idea from Firebase: ', error);
        showMessage('Failed to delete event idea from Firebase', 'error');
    }
}

// Local storage functions for event ideas
function loadEventIdeasLocally() {
    const savedEventIdeas = JSON.parse(localStorage.getItem('savedEventIdeas') || '[]');
    allEventIdeas = savedEventIdeas;
    updateEventIdeasDisplay();
}

function saveEventIdeasLocally() {
    localStorage.setItem('savedEventIdeas', JSON.stringify(allEventIdeas));
}