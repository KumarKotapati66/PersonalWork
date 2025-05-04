// JS Controller
import { LightningElement, api, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getWeeklyMenu from '@salesforce/apex/WeeklyMenuController.getWeeklyMenu';

export default class WeeklyMenuViewer extends LightningElement {

    @api messId;
    @api dateRange; // Will be in format "Fri Mar 14 2025 05:30:00 GMT+0530 (India Standard Time)"
    
    @track weekDays = [];
    @track mealTypes = []; // Will be populated dynamically from data
    @track wiredMenuResult;
    @track isLoading = true;
    @track isDebugging = false; // Set to true for debug messages
    @track dataCount = 0; // For debugging
    
    // Keep track of visible tooltips
    @track currentTooltip = null;
    
    connectedCallback() {
        console.log('dateRange:::', this.dateRange);
        this.initializeDates();
    }
    
    // Initialize the dates for the week
    initializeDates() {
        if (this.dateRange) {
            this.generateWeekFromDate(this.dateRange);
        } else {
            // Default to current date if no date range provided
            const today = new Date();
            this.generateWeekFromDate(today);
        }
    }
    
    // Generate week from a specific date
    generateWeekFromDate(dateInput) {
        // Parse the dateRange string to a Date object if it's a string
        let startDate;
        if (typeof dateInput === 'string') {
            startDate = new Date(dateInput);
        } else {
            startDate = dateInput;
        }
        
        // Don't adjust to Monday - use the exact provided date as the start date
        this.generateWeekDays(startDate);
    }
    
    // Generate array of weekdays from start date
    generateWeekDays(startDate) {
        this.weekDays = [];
        
        // Set up day names and month names
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Generate 7 days starting from the provided date
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayObj = {
                fullDate: this.formatDateString(date),
                dayName: dayNames[date.getDay()], // Use actual day of week
                shortDay: shortDays[date.getDay()],
                date: date.getDate(),
                month: months[date.getMonth()],
                hasMenuItems: false,
                mealSections: {} // Will hold dynamic meal type data
            };
            
            this.weekDays.push(dayObj);
        }
        
        // Now fetch menu data for these dates
        this.fetchMenuData();
    }
    
    // Format date to YYYY-MM-DD
    formatDateString(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    // Fetch menu data from Apex
    fetchMenuData() {
        const startDate = this.weekDays[0].fullDate;
        console.log('startDate:::', startDate);
        this.isLoading = true;
        
        getWeeklyMenu({ messId: this.messId, startDate: startDate })
            .then(result => {
                console.log('Data received:', result);
                this.dataCount = result.length;
                
                if (result && result.length > 0) {
                    // First, identify all unique meal types and their times
                    this.identifyMealTypes(result);
                    
                    // Then process the menu data
                    this.processMenuData(result);
                } else {
                    console.log('No data received or empty result');
                }
                
                this.wiredMenuResult = result;
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error fetching menu data:', error);
                this.isLoading = false;
            });
    }
    
    // Identify all unique meal types and their times from the data
    identifyMealTypes(data) {
        // Create a map to store unique meal types and their times
        const mealTypeMap = new Map();
        
        data.forEach(item => {
            const mealType = item.Type__c;
            if (mealType && !mealTypeMap.has(mealType)) {
                mealTypeMap.set(mealType, {
                    type: mealType,
                    label: mealType,
                    // Use the first occurrence of this meal type for times
                    startTime: this.formatTime(item.Start_Time__c),
                    endTime: this.formatTime(item.End_Time__c)
                });
            }
        });
        
        // Convert map to array and sort (you can define custom sort order if needed)
        const mealTypesArray = Array.from(mealTypeMap.values());
        
        // Default sort order if needed
        const defaultOrder = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
        
        mealTypesArray.sort((a, b) => {
            const indexA = defaultOrder.indexOf(a.type);
            const indexB = defaultOrder.indexOf(b.type);
            
            // If both found in default order, use that
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            // If only one found, prioritize the one in default order
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            // Otherwise alphabetical
            return a.type.localeCompare(b.type);
        });
        
        this.mealTypes = mealTypesArray;
        
        // Initialize meal sections for each day
        this.initializeMealSections();
    }
    
    // Format time string from Apex
    formatTime(timeValue) {
        if (!timeValue && timeValue !== 0) return '';
        
        try {
            // Convert string to number if needed
            const timeNumber = typeof timeValue === 'string' ? parseInt(timeValue, 10) : timeValue;
            
            // Handle numeric timestamp in milliseconds (e.g. 25200000 for 7:00 AM)
            if (!isNaN(timeNumber)) {
                // Convert milliseconds to hours and minutes
                const totalMinutes = Math.floor(timeNumber / 60000); // 60000 ms in a minute
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                // Format with AM/PM
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const hours12 = hours % 12 || 12; // Convert 0 to 12
                const minutesStr = minutes < 10 ? '0' + minutes : minutes;
                
                return `${hours12}:${minutesStr} ${ampm}`;
            }
            
            // If it's a string, try other formats
            if (typeof timeValue === 'string') {
                // Handle ISO format time strings (e.g., "07:00:00.000Z")
                if (timeValue.includes('Z') || timeValue.includes('+')) {
                    // If it's a full ISO datetime, parse it as a Date
                    if (timeValue.includes('T')) {
                        const date = new Date(timeValue);
                        const hours = date.getUTCHours();
                        const minutes = date.getUTCMinutes();
                        
                        // Format with AM/PM
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        const hours12 = hours % 12 || 12; // Convert 0 to 12
                        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
                        
                        return `${hours12}:${minutesStr} ${ampm}`;
                    } else {
                        // If it's just a time with Z, remove the Z and process as HH:MM:SS
                        timeValue = timeValue.replace('Z', '').replace('.000', '');
                    }
                }
                
                // Process HH:MM:SS format
                if (timeValue.includes(':')) {
                    const parts = timeValue.split(':');
                    const hours = parseInt(parts[0], 10);
                    const minutes = parseInt(parts[1], 10);
                    
                    // Format with AM/PM
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const hours12 = hours % 12 || 12; // Convert 0 to 12
                    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
                    
                    return `${hours12}:${minutesStr} ${ampm}`;
                } 
                // Handle decimal time format
                else if (!isNaN(parseFloat(timeValue))) {
                    const decimalTime = parseFloat(timeValue);
                    const hours = Math.floor(decimalTime);
                    const minutes = Math.round((decimalTime - hours) * 60);
                    
                    // Format with AM/PM
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const hours12 = hours % 12 || 12; // Convert 0 to 12
                    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
                    
                    return `${hours12}:${minutesStr} ${ampm}`;
                }
            }
            
            // If we couldn't parse it in any known format, return as is
            return '';
        } catch (error) {
            console.error('Error formatting time:', error, timeValue);
            return ''; // Return empty string on error to prevent rendering issues
        }
    }
    
    // Initialize meal sections for each day based on identified meal types
    initializeMealSections() {
        this.weekDays.forEach(day => {
            day.mealSections = {};
            
            this.mealTypes.forEach(mealType => {
                // Create a safe property name from the meal type
                const propName = this.getSafePropName(mealType.type);
                
                // Initialize the meal section with proper properties
                day.mealSections[propName] = {
                    type: mealType.type,
                    items: [],
                    displayItems: [],
                    hasMoreItems: false,
                    uniqueId: `${day.fullDate}-${propName}`
                };
            });
        });
    }
    
    // Convert meal type to a safe property name
    getSafePropName(mealType) {
        if (!mealType) return '';
        // Remove spaces and special characters, convert to camelCase
        return mealType.replace(/[^a-zA-Z0-9]/g, '')
            .replace(/\s+(.)/g, (match, group) => group.toUpperCase());
    }
    
    // Process the menu data returned from Apex
    processMenuData(data) {
        // Create a deep copy of week days
        const updatedWeekDays = JSON.parse(JSON.stringify(this.weekDays));
        
        // Initialize all sections with empty arrays
        updatedWeekDays.forEach(day => {
            Object.keys(day.mealSections).forEach(propName => {
                day.mealSections[propName].items = [];
                day.mealSections[propName].displayItems = [];
                day.mealSections[propName].hasMoreItems = false;
                day.mealSections[propName].totalItems = 0;
            });
        });
        
        // Create a map to track unique items for each day and meal type
        const uniqueItemMap = new Map();
        
        // Process each menu item
        data.forEach(item => {
            const dateStr = item.Date__c;
            const mealType = item.Type__c;
            const itemName = item.Item__c ? item.Item__c.trim() : '';
            
            // Skip empty items and "All Items"
            if (!itemName || itemName === 'All Items') {
                return;
            }
            
            // Create unique key for tracking duplicates
            const key = `${dateStr}-${mealType}-${itemName}`;
            
            // Skip if this is a duplicate
            if (uniqueItemMap.has(key)) {
                return;
            }
            
            // Mark as seen
            uniqueItemMap.set(key, true);
            
            // Find the day
            const dayIndex = updatedWeekDays.findIndex(day => day.fullDate === dateStr);
            
            if (dayIndex !== -1) {
                const day = updatedWeekDays[dayIndex];
                day.hasMenuItems = true;
                
                // Get safe property name for this meal type
                const propName = this.getSafePropName(mealType);
                
                // Skip if meal section doesn't exist
                if (!day.mealSections[propName]) return;
                
                // Add item to the items array
                const menuItem = {
                    id: item.Id || `${dateStr}-${mealType}-${uniqueItemMap.size}`,
                    name: itemName,
                    category: item.Category__c
                };
                
                day.mealSections[propName].items.push(menuItem);
            }
        });
        
        // After adding all items, determine display items and more flags
        updatedWeekDays.forEach(day => {
            Object.keys(day.mealSections).forEach(propName => {
                const section = day.mealSections[propName];
                
                // Skip processing if no items
                if (!section.items || section.items.length === 0) {
                    section.totalItems = 0;
                    section.hasMoreItems = false;
                    section.displayItems = [];
                    return;
                }
                
                // Sort items if needed - by category would be nice
                section.items.sort((a, b) => {
                    // First sort by category if available
                    if (a.category && b.category && a.category !== b.category) {
                        return a.category.localeCompare(b.category);
                    }
                    // Then by name
                    return a.name.localeCompare(b.name);
                });
                
                // Show max 4 items
                const maxDisplay = 4;
                section.displayItems = section.items.slice(0, maxDisplay);
                
                // Set total items count
                section.totalItems = section.items.length;
                
                // Set hasMoreItems flag - only if there are more than max display items
                section.hasMoreItems = section.totalItems > maxDisplay;
                
                console.log(`Processed section ${day.fullDate}-${section.type}: items=${section.totalItems}, hasMore=${section.hasMoreItems}`);
            });
        });
        
        this.weekDays = updatedWeekDays;
        
        // After updating the data model, we need to manually update the DOM
        this.renderMenuContent();
    }
    
    // Debugging helper method
    debugAllSections() {
        console.log('===== DEBUGGING ALL SECTIONS =====');
        this.weekDays.forEach(day => {
            console.log(`Day: ${day.fullDate}`);
            Object.keys(day.mealSections).forEach(propName => {
                const section = day.mealSections[propName];
                console.log(`  Meal: ${section.type}, Items: ${section.items.length}, HasMore: ${section.hasMoreItems}`);
            });
        });
        console.log('=================================');
    }
    
    // Render menu content in the DOM after data is processed
    renderMenuContent() {
        // Wait for the next rendering cycle to ensure DOM elements are ready
        setTimeout(() => {
            // DEBUG: Log the full data structure before rendering
            this.debugAllSections();
            
            // FIRST PASS: Hide all info icons by default
            const allInfoIcons = this.template.querySelectorAll('.info-icon');
            allInfoIcons.forEach(icon => {
                icon.classList.add('hidden');
            });
            
            // For each day and meal type, render the content
            this.weekDays.forEach(day => {
                Object.keys(day.mealSections).forEach(propName => {
                    const section = day.mealSections[propName];
                    const mealType = section.type;
                    
                    // Log this section specifically
                    console.log(`Rendering section ${day.fullDate}-${mealType}: ${section.items.length} items`);
                    
                    // Find the corresponding DOM elements
                    const mealSection = this.template.querySelector(
                        `.meal-section[data-meal-type="${mealType}"][data-day="${day.fullDate}"]`
                    );
                    
                    const infoIcon = this.template.querySelector(
                        `.info-icon[data-meal-type="${mealType}"][data-cell-id="${day.fullDate}"]`
                    );
                    
                    const tooltip = this.template.querySelector(
                        `.tooltip-content[data-meal-type="${mealType}"][data-cell-id="${day.fullDate}"]`
                    );
                    
                    // Skip if any elements not found
                    if (!mealSection || !infoIcon || !tooltip) {
                        console.error(`Missing DOM elements for ${day.fullDate}-${mealType}`);
                        return;
                    }
                    
                    // Clear existing content
                    mealSection.innerHTML = '';
                    
                    // Check if we have any items at all
                    const itemCount = section.items ? section.items.length : 0;
                    
                    // Add display items (up to 4)
                    if (itemCount > 0) {
                        section.displayItems.forEach(item => {
                            const itemElem = document.createElement('div');
                            itemElem.className = 'menu-item';
                            itemElem.textContent = item.name;
                            mealSection.appendChild(itemElem);
                        });
                        
                        // Now explicitly show the info icon only if there are more than 4 items
                        if (itemCount > 4) {
                            console.log(`Showing info icon for ${day.fullDate}-${mealType} (${itemCount} items)`);
                            infoIcon.classList.remove('hidden');
                        }
                    }
                    
                    // Update tooltip content
                    const tooltipHeader = tooltip.querySelector('.tooltip-header');
                    if (tooltipHeader) {
                        tooltipHeader.textContent = `All Items (${itemCount})`;
                    }
                    
                    const tooltipItems = tooltip.querySelector('.tooltip-items');
                    if (tooltipItems) {
                        tooltipItems.innerHTML = '';
                        
                        // Add all items to the tooltip
                        if (itemCount > 0) {
                            section.items.forEach(item => {
                                const tooltipItem = document.createElement('div');
                                tooltipItem.className = 'tooltip-item';
                                tooltipItem.textContent = item.name;
                                tooltipItems.appendChild(tooltipItem);
                            });
                        }
                    }
                });
            });
            
            // Final verification that all info icons are properly hidden/shown
            console.log("Icon visibility check complete");
        }, 0);
    }
    
    // Handle info icon click - show tooltip
    handleInfoClick(event) {
        event.stopPropagation();
        
        // Get the data attributes from the clicked icon
        const cellId = event.currentTarget.dataset.cellId;
        const mealType = event.currentTarget.dataset.mealType;
        
        if (!cellId || !mealType) return;
        
        // Close any open tooltips first
        this.closeAllTooltips();
        
        // Find and show the tooltip for this cell and meal type
        const tooltip = this.template.querySelector(
            `.tooltip-content[data-cell-id="${cellId}"][data-meal-type="${mealType}"]`
        );
        
        if (tooltip) {
            tooltip.classList.remove('hidden');
            tooltip.classList.add('visible');
            
            // Store the current tooltip info
            this.currentTooltip = {
                cellId: cellId,
                mealType: mealType
            };
            
            // Add document click listener for closing
            setTimeout(() => {
                window.addEventListener('click', this.handleDocumentClick.bind(this), { once: true });
            }, 0);
        }
    }
    
    // Close all tooltips
    closeAllTooltips() {
        const tooltips = this.template.querySelectorAll('.tooltip-content');
        tooltips.forEach(tooltip => {
            tooltip.classList.add('hidden');
            tooltip.classList.remove('visible');
        });
        this.currentTooltip = null;
    }
    
    // Handle document click to close tooltips
    handleDocumentClick(event) {
        this.closeAllTooltips();
    }
    
    // Refresh the data
    refreshData() {
        this.isLoading = true;
        
        // Refresh data from Apex
        refreshApex(this.wiredMenuResult)
            .then(() => {
                // Reload menu
                this.initializeDates();
            })
            .catch(error => {
                console.error('Error refreshing data:', error);
                this.isLoading = false;
            });
    }
}