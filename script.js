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
        
        // Collect all events in the dependency tree
        const eventTree = collectEventTree(rootEvent, allEvents);
        console.log('eventTree:', eventTree);
        
        // Check for duplicates (should not happen due to Map usage, but good to verify)
        const eventIds = eventTree.map(event => event.id);
        const uniqueIds = new Set(eventIds);
        const duplicatesFound = eventIds.length !== uniqueIds.size;
        
        if (duplicatesFound) {
            console.warn('Duplicates detected in event tree - this should not happen!');
            const duplicateIds = eventIds.filter((id, index) => eventIds.indexOf(id) !== index);
            console.warn('Duplicate IDs:', duplicateIds);
        } else {
            console.log(`Event tree validated: ${eventTree.length} unique events, no duplicates found`);
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
    message.className = `toast-message fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
    message.textContent = text;
    
    document.body.appendChild(message);
    
    // Animate in
    setTimeout(() => {
        message.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        message.classList.add('translate-x-full');
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
                    selectedDependencies.items.get(inputId);
    return selected ? Array.from(selected) : [];
}

function getSelectedValuesFromElement(inputElement) {
    if (!inputElement) return [];
    
    // Find the selected container for this input
    const container = inputElement.parentElement.parentElement;
    const eventSelected = container.querySelector('.choice-dependent-events-selected');
    const choiceSelected = container.querySelector('.choice-dependent-choices-selected');
    
    let selectedContainer;
    if (inputElement.classList.contains('choice-dependent-events')) {
        selectedContainer = eventSelected;
    } else if (inputElement.classList.contains('choice-dependent-choices')) {
        selectedContainer = choiceSelected;
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

// Remove the old getItemsList function as it's now defined above with the new implementation

function updateDependencySelects() {
    // Initialize autocomplete for main dependency inputs
    initializeAutocomplete('dependentEventIds', allEvents, 'event');
    initializeAutocomplete('dependentChoiceIds', allChoices, 'choice');
    initializeAutocomplete('triggerItems', allItems, 'item');
    
    // Initialize autocomplete for choice dependency inputs
    const choiceElements = document.querySelectorAll('.choice-item');
    choiceElements.forEach(choiceElement => {
        const eventInput = choiceElement.querySelector('.choice-dependent-events');
        const choiceInput = choiceElement.querySelector('.choice-dependent-choices');
        
        if (eventInput) initializeAutocompleteForElement(eventInput, allEvents, 'event');
        if (choiceInput) initializeAutocompleteForElement(choiceInput, allChoices, 'choice');
    });
}

// Global storage for selected dependencies
const selectedDependencies = {
    events: new Map(),
    choices: new Map(),
    items: new Map()
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
    
    const dropdown = input.parentElement.querySelector(`.choice-dependent-${type}s-dropdown`);
    const selectedContainer = input.parentElement.parentElement.querySelector(`.choice-dependent-${type}s-selected`);
    
    const uniqueId = `choice-${Date.now()}-${Math.random()}`;
    
    // Store the uniqueId in the input for later reference
    input.dataset.uniqueId = uniqueId;
    
    setupAutocompleteEvents(input, dropdown, selectedContainer, items, type, uniqueId);
    
    // Process pending values stored in the input element
    processPendingValuesFromElement(input, items, type, selectedContainer, dropdown, uniqueId);
}

function setupAutocompleteEvents(input, dropdown, selectedContainer, items, type, uniqueId) {
    if (!selectedDependencies[type + 's'].has(uniqueId)) {
        selectedDependencies[type + 's'].set(uniqueId, new Set());
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
    const selected = selectedDependencies[type + 's'].get(uniqueId);
    const filtered = items.filter(item => {
        let text;
        if (type === 'event') {
            text = item.title;
        } else if (type === 'choice') {
            text = item.text;
        } else if (type === 'item') {
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
    const selected = selectedDependencies[type + 's'].get(uniqueId);
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
    }
    
    badge.className = `${colorClass} text-white px-2 py-1 rounded text-xs flex items-center gap-1`;
    badge.innerHTML = `
        <span>${text.length > 20 ? text.substring(0, 20) + '...' : text}</span>
        <button type="button" class="text-white hover:text-gray-300" onclick="removeSelectedItem('${item.id}', '${type}', '${uniqueId}', this)">×</button>
    `;
    badge.dataset.itemId = item.id;
    
    selectedContainer.appendChild(badge);
    dropdown.classList.add('hidden');
    
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
    const selected = selectedDependencies[type + 's'].get(uniqueId);
    selected.delete(itemId);
    
    // Remove the badge
    const badge = buttonElement.closest('div');
    badge.remove();
}

function refreshReferenceLists() {
    // Update from current form
    const currentFormEvent = generateEventJson();
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
    
    showMessage('Reference lists refreshed!');
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
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-blue-300">Dependent Events</label>
                    <div class="relative">
                        <input type="text" class="choice-dependent-events w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                               placeholder="Type event name..." autocomplete="off">
                        <div class="choice-dependent-events-dropdown absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-lg mt-1 max-h-32 overflow-y-auto hidden">
                        </div>
                    </div>
                    <div class="choice-dependent-events-selected flex flex-wrap gap-1">
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-green-300">Dependent Choices</label>
                    <div class="relative">
                        <input type="text" class="choice-dependent-choices w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" 
                               placeholder="Type choice text..." autocomplete="off">
                        <div class="choice-dependent-choices-dropdown absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-lg mt-1 max-h-32 overflow-y-auto hidden">
                        </div>
                    </div>
                    <div class="choice-dependent-choices-selected flex flex-wrap gap-1">
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
        dependentEventIds: getSelectedValues('dependentEventIds'),
        dependentChoiceIds: getSelectedValues('dependentChoiceIds'),
        trigger: generateTrigger()
    };
    
    // Add choices
    const choiceItems = document.querySelectorAll('.choice-item');
    choiceItems.forEach(choiceItem => {
        const choice = {
            id: generateGuid(),
            text: choiceItem.querySelector('.choice-text').value,
            dependentEventIds: getSelectedValuesFromElement(choiceItem.querySelector('.choice-dependent-events')),
            dependentChoiceIds: getSelectedValuesFromElement(choiceItem.querySelector('.choice-dependent-choices')),
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
    
    // Get selected items from the autocomplete system
    const selectedItems = getSelectedValues('triggerItems');
    if (selectedItems.length > 0) {
        trigger.items = selectedItems;
    }
    
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
        } catch (error) {
            console.error('Firebase loading failed, falling back to localStorage:', error);
            loadSavedEvents();
            loadItemsLocally();
        }
    } else {
        loadSavedEvents();
        loadItemsLocally();
    }
}


// Function to identify dependent events (events that are dependencies of other events)
function findDependentEvents(savedEvents) {
    const allEventIds = new Set(savedEvents.map(event => event.id));
    const dependentEventIds = new Set();
    
    // Collect all event IDs that are dependencies of other events
    savedEvents.forEach(event => {
        // Add direct event dependencies
        if (event.dependentEventIds) {
            event.dependentEventIds.forEach(depId => {
                if (allEventIds.has(depId)) {
                    dependentEventIds.add(depId);
                }
            });
        }
        
        // Add choice dependencies (events that contain dependent choices)
        if (event.dependentChoiceIds) {
            event.dependentChoiceIds.forEach(choiceId => {
                // Find which event contains this choice
                const parentEvent = savedEvents.find(e => 
                    e.choices && e.choices.some(choice => choice.id === choiceId)
                );
                if (parentEvent) {
                    dependentEventIds.add(parentEvent.id);
                }
            });
        }
        
        // Add events referenced by choice dependencies
        if (event.choices) {
            event.choices.forEach(choice => {
                if (choice.dependentEventIds) {
                    choice.dependentEventIds.forEach(depId => {
                        if (allEventIds.has(depId)) {
                            dependentEventIds.add(depId);
                        }
                    });
                }
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
        if (visited.has(event.id)) return; // Prevent infinite loops
        visited.add(event.id);
        
        // Add current event to collection
        collectedEvents.set(event.id, event);
        
        // Collect forward dependencies (events this event depends on)
        if (event.dependentEventIds) {
            event.dependentEventIds.forEach(depId => {
                const depEvent = eventMap.get(depId);
                if (depEvent && !visited.has(depId)) {
                    collectDependencies(depEvent, visited);
                }
            });
        }
        
        // Collect events that contain dependent choices
        if (event.dependentChoiceIds) {
            event.dependentChoiceIds.forEach(choiceId => {
                const parentEvent = allSavedEvents.find(e => 
                    e.choices && e.choices.some(choice => choice.id === choiceId)
                );
                if (parentEvent && !visited.has(parentEvent.id)) {
                    collectDependencies(parentEvent, visited);
                }
            });
        }
        
        // Collect dependencies from choices
        if (event.choices) {
            event.choices.forEach(choice => {
                if (choice.dependentEventIds) {
                    choice.dependentEventIds.forEach(depId => {
                        const depEvent = eventMap.get(depId);
                        if (depEvent && !visited.has(depId)) {
                            collectDependencies(depEvent, visited);
                        }
                    });
                }
            });
        }
        
        // Collect backward dependencies (events that depend on this event)
        allSavedEvents.forEach(otherEvent => {
            if (otherEvent.id === event.id) return; // Skip self
            
            // Check if other event depends on current event
            let dependsOnCurrent = false;
            
            // Direct dependency
            if (otherEvent.dependentEventIds && otherEvent.dependentEventIds.includes(event.id)) {
                dependsOnCurrent = true;
            }
            
            // Choice dependency
            if (otherEvent.choices) {
                otherEvent.choices.forEach(choice => {
                    if (choice.dependentEventIds && choice.dependentEventIds.includes(event.id)) {
                        dependsOnCurrent = true;
                    }
                });
            }
            
            // Choice container dependency
            if (otherEvent.dependentChoiceIds && event.choices) {
                event.choices.forEach(choice => {
                    if (otherEvent.dependentChoiceIds.includes(choice.id)) {
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
    return Array.from(collectedEvents.values());
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
    console.log('generateItem called');
    const item = generateItemJson();
    console.log('Generated item from generateItemJson:', item);
    
    if (item) {
        currentItem = item;
        console.log('Set currentItem to:', currentItem);
        
        // Show the JSON in console for debugging
        console.log('Generated Item:', JSON.stringify(item, null, 2));
        
        // Update preview with the generated item
        updateItemPreview();
        
        console.log('Firebase check in generateItem - typeof firebase:', typeof firebase);
        console.log('Firebase check in generateItem - firebase.apps.length:', firebase.apps ? firebase.apps.length : 'undefined');
        
        // Try Firebase first, fallback to local storage
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            console.log('Using Firebase to save generated item');
            saveItemToFirebase(item.item);
        } else {
            console.log('Using local storage to save generated item');
            // Automatically add to items list locally
            allItems.push(item.item);
            updateItemsDisplay();
            showMessage(`Item "${item.item.name}" generated and added to list!`);
        }
        
        // Close the modal after successful generation
        hideItemModal();
    } else {
        console.log('No item generated');
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
    console.log('addItemToList called');
    const item = currentItem || generateItemJson();
    console.log('Item to add:', item);
    
    if (item) {
        console.log('Firebase check - typeof firebase:', typeof firebase);
        console.log('Firebase check - firebase.apps.length:', firebase.apps ? firebase.apps.length : 'undefined');
        
        // Try Firebase first, fallback to local storage
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            console.log('Using Firebase to save item');
            saveItemToFirebase(item.item);
        } else {
            console.log('Using local storage to save item');
            // Add to allItems array locally
            allItems.push(item.item);
            updateItemsDisplay();
            showMessage(`Item "${item.item.name}" added to items list!`);
        }
        
        hideItemModal();
    } else {
        console.log('No item to add');
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
            // Check if this event depends on the target event
            if (event.dependentEventIds && event.dependentEventIds.includes(targetEventId)) {
                backwardDeps.push(event);
            }
            // Check if any of this event's choices depend on the target event
            if (event.choices && options.includeChoices) {
                event.choices.forEach(choice => {
                    if (choice.dependentEventIds && choice.dependentEventIds.includes(targetEventId)) {
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
        
        // Add forward dependencies (events this event depends on)
        if (options.showForward && event.dependentEventIds && event.dependentEventIds.length > 0) {
            event.dependentEventIds.forEach(depId => {
                const depEvent = eventMap.get(depId);
                if (depEvent) {
                    node.children.push(buildNode(depEvent, depth + 1, 'forward'));
                }
            });
        }
        
        // Add events that contain dependent choices
        if (options.showForward && event.dependentChoiceIds && event.dependentChoiceIds.length > 0) {
            const eventsWithChoices = findEventsContainingChoices(event.dependentChoiceIds);
            eventsWithChoices.forEach(choiceEvent => {
                // Only add if this event isn't already in the tree at this level
                const existingChild = node.children.find(child => child.id === choiceEvent.id);
                if (!existingChild) {
                    node.children.push(buildNode(choiceEvent, depth + 1, 'choice-container'));
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
    
    // Remove empty levels and adjust indices
    const compactLevels = levels.filter(level => level && level.length > 0);
    const maxWidth = Math.max(...compactLevels.map(level => level.length)) * (nodeWidth + nodeSpacing);
    const legendHeight = 140; // Increased for larger legend
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
            const isBackward = node.direction === 'backward';
            
            let fillColor, strokeColor;
            if (isRoot) {
                fillColor = '#7c3aed';
                strokeColor = '#8b5cf6';
            } else if (isCircular) {
                fillColor = '#dc2626';
                strokeColor = '#ef4444';
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
    
    // Direction indicators
    svg += `<text x="30" y="${legendY + 85}" fill="#9ca3af" font-size="10">Arrows: ↑ Forward deps, ↓ Backward deps (Reversed Layout)</text>`;
    
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
        
        if (event.target === loadModal) {
            hideLoadModal();
        }
        if (event.target === treeModal) {
            hideTreeModal();
        }
        if (event.target === itemModal) {
            hideItemModal();
        }
    });
    
    // ESC key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            hideLoadModal();
            hideTreeModal();
            hideItemModal();
        }
    });
    
    // Load saved events on page load
    loadEvents();
    
    // Initialize event filter buttons
    updateEventFilterButtons();
    
    // Initialize items display
    updateItemsDisplay();
    
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
                events.push({
                    ...event,
                    firebaseKey: key, // Store the Firebase auto-generated key for deletion
                    // Convert Firebase timestamp to readable format if needed
                    savedAt: event.savedAt || new Date(event.createdAt || Date.now()).toISOString()
                });
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
            dependentEventIds: event.dependentEventIds || [],
            dependentChoiceIds: event.dependentChoiceIds || [],
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
    console.log('Loading items locally - currently in memory only');
    updateItemsDisplay();
}
