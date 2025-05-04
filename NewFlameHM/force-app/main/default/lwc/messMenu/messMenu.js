import { LightningElement, track, api, wire } from 'lwc';

import getMenus from '@salesforce/apex/MessMenuController.getMenus';
import getMess from '@salesforce/apex/MessMenuController.getMess';
import getMessSchedule from '@salesforce/apex/MessMenuController.getMessSchedule';
import getDailyMenuItems from '@salesforce/apex/MessMenuController.getDailyMenuItems';
import getMenuItems from '@salesforce/apex/MessMenuController.getMenuItems';
import saveMenuConfig from '@salesforce/apex/MessMenuController.saveMenuConfig';
import hasMessAdminPermission from '@salesforce/apex/MessMenuController.hasMessAdminPermission';
import getMenuDetail from '@salesforce/apex/MessMenuController.getMenuDetail';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord } from "lightning/uiRecordApi";
import { refreshApex } from "@salesforce/apex";
import LightningConfirm from 'lightning/confirm';

/* Menu Object Fields*/
import APPROVAL_STATUS from '@salesforce/schema/Menu__c.Approval_Status__c';
import MENU_COMMENTS from '@salesforce/schema/Menu__c.Approval_Reject_Comments__c';
import MENU_ID from '@salesforce/schema/Menu__c.Id';

export default class MenuMess extends LightningElement {
    selectedMenuId;
    startDate;
    endDate;
    selectedMessId;

    @track menuOptions = [];
    @track messOptions = [];

    loading = false;
    showPreview = false;
    showDateError = false;
    @track scheduleData = [];
    @track menuItems = [];
    @track dailyMenuItems = []; // Added for Daily Menu records
    @track displayedDays = [];
    @track categories = [];
    @track editingColumn = null; // Tracks which column is currently being edited

    // Maps for lookup
    scheduleTimeMap = {};
    menuItemMap = {};
    previewClickCount = 0;

    // Define menu types in the desired order
    orderedMenuTypes = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

    //Mess Admin Buttons
    hasMessAdminPermission = false;
    isModalOpen = false
    modalTitle;
    comment;
    actionType;
    menuResult;
    selectedMenuStatus;

    // Added this property to track unsaved changes
    hasUnsavedChanges = false;

    // Wire method to get available menus for the combobox
    @wire(getMenus)
    wiredMenus({ error, data }) {
        if (data) {
            this.menuOptions = data.map(menu => ({
                label: menu.Name,
                value: menu.Id
            }));
        } else if (error) {
            console.error('Error loading menus', error);
            this.showToast('Error', 'Failed to load menus', 'error');
        }
    }

    // Wire method to get available mess for the combobox
    @wire(getMess)
    wiredMess({ error, data }) {
        if (data) {
            this.messOptions = data.map(mess => ({
                label: mess.Name,
                value: mess.Id
            }));
        } else if (error) {
            console.error('Error loading Mess records', error);
            this.showToast('Error', 'Failed to load Mess', 'error');
        }
    }

    //Check Mess Admin Permission
    @wire(hasMessAdminPermission)
    wiredPermission({ error, data }) {
        if (data) {
            console.log('permission data::', JSON.stringify(data));
            this.hasMessAdminPermission = true;

        } else if (error) {
            console.error('Error fetching permission:', JSON.stringify(error));

        }
    }

    //Get the Menu Approval Status
    @wire(getMenuDetail, { menuId: '$selectedMenuId' })
    wiredMenuDetail(result) {
        this.menuResult = result;
        const {data,error} = result;
        if (data) {
            console.log('Menu detail is ::', JSON.stringify(data));
            this.selectedMenuStatus = data[0]?.Approval_Status__c;

        } else if (error) {
            console.error('Error fetching Menu detail:', JSON.stringify(error));

        }
    }

    // Input handlers
    handleMenuChange(event) {
        this.selectedMenuId = event.detail.value;
    }

    handleMessChange(event) {
        this.selectedMessId = event.detail.value;
    }

    handleDateChange(event) {
        const field = event.target.dataset.field;
        if (field === 'startDate') {
            this.startDate = event.target.value;
        } else if (field === 'endDate') {
            this.endDate = event.target.value;
        }

        // Check date validity and show error if needed
        this.validateDates();
    }

    // Method to validate dates
    validateDates() {
        this.showDateError = false;

        if (this.startDate && this.endDate) {
            const startDateObj = new Date(this.startDate);
            const endDateObj = new Date(this.endDate);

            if (startDateObj > endDateObj) {
                this.showDateError = true;
            }
        }
    }

    // Preview button handler
    handlePreviewMenu() {
        if (this.isFormValid) {
            this.showPreview = false; // Hide current preview if any
            console.log('preview count:::', this.previewClickCount);
            if (this.previewClickCount) {
                console.log('preview into not null:::');
                this.forceRefresh();
            } else {
                console.log('preview into null:::');
                this.loadData();
            }
        }
    
        this.previewClickCount++;
        
        // After the preview is shown and data is loaded, position the vertical divider
        setTimeout(() => {
            this.positionVerticalDivider();
        }, 300);
    }

    // Validation getter
    get isFormValid() {
        // Check if all required fields are filled
        const allFieldsFilled = this.selectedMenuId && this.startDate && this.endDate && this.selectedMessId;

        // Check if dates are valid
        let datesValid = false;
        if (this.startDate && this.endDate) {
            const startDateObj = new Date(this.startDate);
            const endDateObj = new Date(this.endDate);
            datesValid = startDateObj <= endDateObj;
        }

        return allFieldsFilled && datesValid;
    }

    // Getter for disabling the button (HTML binding needs positive property)
    get isFormInvalid() {
        return !this.isFormValid;
    }

    // Data loading
    loadData() {
        this.loading = true;
        this.showPreview = false; // Hide current preview if any

        // First fetch the schedule data
        this.fetchMenuSchedule()
            .then(() => {
                // Then fetch both daily menu items and template items in parallel
                return Promise.all([
                    this.fetchDailyMenuItems(),
                    this.fetchMenuItems()
                ]);
            })
            .then(([dailyItems, templateItems]) => {
                // Store both data sources
                this.dailyMenuItems = dailyItems || [];
                this.menuItems = templateItems || [];

                console.log('Daily menu items: ' + this.dailyMenuItems.length);
                console.log('Template menu items: ' + this.menuItems.length);

                // Process the combined data
                this.processData();
                this.loading = false;
                this.showPreview = true; // Show preview after data is loaded

                // Wait for components to render, then populate the cells
                setTimeout(() => {
                    this.populateCells();
                    this.ensureHorizontalScroll();
                    this.addEditIcons();
                }, 0);
            })
            .catch(error => {
                console.error('Error loading data: ', error);
                this.loading = false;
                this.showToast('Error', 'Failed to load menu data', 'error');
            });
    }

    fetchMenuSchedule() {
        return getMessSchedule({ messId: this.selectedMessId })
            .then(result => {
                this.scheduleData = result;
                return result;
            });
    }

    // Modify fetchDailyMenuItems to support a refresh token
    fetchDailyMenuItems(refreshToken) {
        const params = {
            menuId: this.selectedMenuId,
            messId: this.selectedMessId,
            startDate: this.startDate,
            endDate: this.endDate
        };

        // Add refresh token if provided
        if (refreshToken) {
            params.refreshToken = refreshToken;
        }

        return getDailyMenuItems(params);
    }

    // Keep the original method for fetching template menu items as a fallback
    fetchMenuItems(refreshToken) {
        const params = {
            menuId: this.selectedMenuId
        };

        // Add refresh token if provided
        if (refreshToken) {
            params.refreshToken = refreshToken;
        }

        return getMenuItems(params)
            .then(result => {
                this.menuItems = result || [];
                return result;
            });
    }

    processData() {
        if (!this.scheduleData) return;

        // Create a date range based on start and end dates
        const startDateObj = new Date(this.startDate);
        const endDateObj = new Date(this.endDate);
        const dateRange = this.generateDateRange(startDateObj, endDateObj);

        // Filter schedule data to only include days that exist in the schedule
        const availableDays = new Set(this.scheduleData.map(item => item.Day__c));

        // Map each date to its day of week and check if it exists in schedule
        this.displayedDays = dateRange
            .filter(date => availableDays.has(this.getDayOfWeek(date)))
            .map(date => ({
                date: date,
                dayOfWeek: this.getDayOfWeek(date),
                formattedDate: this.formatDate(date),
                dayNumber: date.getDate(),
                monthShort: this.getMonthShort(date),
                formattedDayMonth: `${date.getDate()}-${this.getMonthShort(date)}-${date.getFullYear().toString().substr(2)}`
            }));

        // Reset maps
        this.scheduleTimeMap = {};
        this.menuItemMap = {};

        // First create a set of all categories from both sources
        const categorySet = new Set();

        // Add categories from template items
        this.menuItems.forEach(item => {
            if (item.Category__c) {
                categorySet.add(item.Category__c);
            }
        });

        // Add categories from daily menu items
        this.dailyMenuItems.forEach(item => {
            if (item.Category__c) {
                categorySet.add(item.Category__c);
            }
        });

        // Convert to array
        this.categories = Array.from(categorySet);

        // Process schedule data (times)
        this.processScheduleTimes();

        if (this.dailyMenuItems.length) {

            this.processDailyMenuItems();

        } else {

            this.processTemplateMenuItems();

        }



    }

    // Process schedule times
    processScheduleTimes() {
        this.scheduleData.forEach(schedule => {
            // Original key that doesn't include specific date (for backwards compatibility)
            const baseKey = `${schedule.Type__c}|${schedule.Day__c}`;

            // Format the time values properly
            const startTime = this.formatTimeValue(schedule.Start_Time__c);
            const endTime = this.formatTimeValue(schedule.End_Time__c);

            // Store time in the base key (for template data)
            this.scheduleTimeMap[baseKey] = `${startTime} - ${endTime}`;

            // Also populate for all matching days in the displayed range
            this.displayedDays.forEach(dayInfo => {
                if (dayInfo.dayOfWeek === schedule.Day__c) {
                    const specificKey = `${schedule.Type__c}|${schedule.Day__c}|${dayInfo.formattedDayMonth}`;
                    // Only set if not already defined by a daily record
                    if (!this.scheduleTimeMap[specificKey]) {
                        this.scheduleTimeMap[specificKey] = `${startTime} - ${endTime}`;
                    }
                }
            });
        });
    }

    // Process daily menu items (records already in Menu_Order__c with RecordType = 'Daily Menu')
    processDailyMenuItems() {
        if (!this.dailyMenuItems || this.dailyMenuItems.length === 0) {
            return; // No daily menu items to process
        }

        // Create time map for daily menu items - this will override template times
        const dailyTimeMap = {};

        // Process daily menu items to extract time and item information
        this.dailyMenuItems.forEach(item => {
            if (!item.Type__c || !item.Day__c || !item.Date__c) return; // Skip invalid items

            // Get formatted day for specific date
            const itemDate = new Date(item.Date__c);
            const formattedDay = `${itemDate.getDate()}-${this.getMonthShort(itemDate)}-${itemDate.getFullYear().toString().substr(2)}`;

            // Store time information if available
            if (item.Start_Time__c && item.End_Time__c) {
                // Create time map key with specific date
                const timeKey = `${item.Type__c}|${item.Day__c}|${formattedDay}`;

                // Format the time values properly
                const startTime = this.formatTimeValue(item.Start_Time__c);
                const endTime = this.formatTimeValue(item.End_Time__c);

                dailyTimeMap[timeKey] = `${startTime} - ${endTime}`;
            }

            // Store menu items if category and item are defined
            if (item.Category__c && item.Item__c) {
                const key = `${item.Type__c}|${item.Day__c}|${formattedDay}|${item.Category__c}`;

                // Initialize if needed
                if (!this.menuItemMap[key]) {
                    this.menuItemMap[key] = [];
                }

                // Add item if not already in the list
                if (!this.menuItemMap[key].includes(item.Item__c)) {
                    // If there's only a placeholder, replace it
                    if (this.menuItemMap[key].length === 1 && this.menuItemMap[key][0] === '-') {
                        this.menuItemMap[key] = [item.Item__c];
                    } else {
                        this.menuItemMap[key].push(item.Item__c);
                    }
                }
            }
        });

        // Override template times with daily menu times
        for (const key in dailyTimeMap) {
            this.scheduleTimeMap[key] = dailyTimeMap[key];
        }

        // Log the menuItemMap for debugging
        console.log('Final menuItemMap after daily items:', JSON.parse(JSON.stringify(this.menuItemMap)));
    }

    // Process template menu items (from Menu_Meal_Setup__c)
    processTemplateMenuItems() {
        // First, create a map to track which items are defined for each menu type, day and category
        const definedMenuItems = {};

        // Collect menu items by type, day, and category
        this.menuItems.forEach(item => {
            if (item.Menu_Type__c && item.Day__c && item.Category__c && item.Menu_Item_Name__c) {
                const dayKey = `${item.Menu_Type__c}|${item.Day__c}|${item.Category__c}`;

                if (!definedMenuItems[dayKey]) {
                    definedMenuItems[dayKey] = [];
                }

                if (!definedMenuItems[dayKey].includes(item.Menu_Item_Name__c)) {
                    definedMenuItems[dayKey].push(item.Menu_Item_Name__c);
                }
            }
        });

        // Only use template items for days that don't have daily menu items
        this.orderedMenuTypes.forEach(menuType => {
            this.displayedDays.forEach(dayInfo => {
                const day = dayInfo.dayOfWeek;
                const formattedDay = dayInfo.formattedDayMonth;

                this.categories.forEach(category => {
                    // Create a unique key that includes the full date
                    const fullKey = `${menuType}|${day}|${formattedDay}|${category}`;
                    const templateKey = `${menuType}|${day}|${category}`;

                    // Only populate from template if not already defined by daily items
                    if (!this.menuItemMap[fullKey]) {
                        if (definedMenuItems[templateKey] && definedMenuItems[templateKey].length > 0) {
                            // Get unique items
                            this.menuItemMap[fullKey] = [...new Set(definedMenuItems[templateKey])];
                        } else {
                            this.menuItemMap[fullKey] = ['-']; // Placeholder if no items
                        }
                    }
                });
            });
        });

        // Log the menuItemMap after template processing for debugging
        console.log('menuItemMap after template items:', JSON.parse(JSON.stringify(this.menuItemMap)));
    }

    populateCells() {
        // Populate schedule time cells
        const timeCells = this.template.querySelectorAll('.time-cell');
        timeCells.forEach(cell => {
            const menuType = cell.dataset.menutype;
            const day = cell.dataset.day;
            const formattedDay = cell.dataset.formattedday;

            // First try to find a specific date-based time
            const specificKey = `${menuType}|${day}|${formattedDay}`;
            const baseKey = `${menuType}|${day}`;

            // Use specific time if available, otherwise fall back to day-based time
            cell.textContent = this.scheduleTimeMap[specificKey] || this.scheduleTimeMap[baseKey] || '';

            // Make sure the formatted day attribute is set
            cell.dataset.formattedday = formattedDay;
        });

        // Populate menu item cells
        const itemCells = this.template.querySelectorAll('.item-cell');
        itemCells.forEach(cell => {
            const menuType = cell.dataset.menutype;
            const day = cell.dataset.day;
            const formattedDay = cell.dataset.formattedday;
            const category = cell.dataset.category;
            const key = `${menuType}|${day}|${formattedDay}|${category}`;

            // Clear any existing content
            cell.innerHTML = '';

            // Add each menu item as a div
            const items = this.menuItemMap[key] || ['-'];
            items.forEach(itemName => {
                const itemDiv = document.createElement('div');
                itemDiv.textContent = itemName;
                itemDiv.className = 'menu-item-entry';

                // Add data attributes to track this item
                itemDiv.dataset.menutype = menuType;
                itemDiv.dataset.day = day;
                itemDiv.dataset.formattedday = formattedDay;
                itemDiv.dataset.category = category;
                itemDiv.dataset.item = itemName;

                cell.appendChild(itemDiv);
            });
        });
    }

    // Add edit icons to column headers
    addEditIcons() {
        const headerCells = this.template.querySelectorAll('th.day-col');
        headerCells.forEach(cell => {
            // Create edit icon container with proper styling
            const editIconContainer = document.createElement('div');
            editIconContainer.className = 'edit-icon-container';
    
            // Get the formatted day for this cell
            const dayOfWeek = cell.querySelector('.day-name').textContent;
            const formattedDay = cell.querySelector('.day-formatted').textContent;
    
            // Create the edit icon
            const editIcon = document.createElement('span');
            editIcon.className = 'edit-icon';
            editIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
    
            // Add data attributes for identification
            editIcon.dataset.day = dayOfWeek;
            editIcon.dataset.formattedday = formattedDay;
    
            // Add click handler
            editIcon.addEventListener('click', (event) => {
                event.stopPropagation();
                this.handleColumnEdit(dayOfWeek, formattedDay);
            });
    
            editIconContainer.appendChild(editIcon);
            cell.appendChild(editIconContainer);
        });
        
        // Ensure the yellow vertical line is visible by adding a specific class to the first column
        const allRows = this.template.querySelectorAll('.menu-table tr');
        allRows.forEach(row => {
            const firstCell = row.querySelector('td:first-child, th:first-child');
            if (firstCell) {
                firstCell.classList.add('sticky-first-column');
            }
        });
    }


    // Cancel column edits
    cancelColumnEdit() {
        if (!this.editingColumn) return;
    
        // Reset unsaved changes flag
        this.hasUnsavedChanges = false;
    
        this.exitEditMode();
        this.populateCells(); // Reset to original data
    }


    // Handle Save Menu action
    async handleSaveMenu() {
        console.log('before save::: ' , this.dailyMenuItems.length);
        if(this.dailyMenuItems.length) {
            console.log('saveComment if:::');
            const result = await LightningConfirm.open({
                message: 'This action will override the existing schedule. Are you sure you want to proceed?',
                label: 'Are you sure?',
                theme: 'warning'
            });

            if (!result) {
                return;
            }
        }
        this.loading = true;

        // Prepare the data for saving
        const menuOrderRecords = this.prepareMenuOrderRecords();

        if (menuOrderRecords.length === 0) {
            this.showToast('Warning', 'No menu items to save', 'warning');
            this.loading = false;
            return;
        }

        console.log('Records to save:', JSON.stringify(menuOrderRecords));

        // Call Apex to save the data
        saveMenuConfig({
            menuId: this.selectedMenuId,
            messId: this.selectedMessId,
            configData: JSON.stringify(menuOrderRecords)
        })
            .then(result => {
                if (result) {
                    this.showToast('Success', 'Menu saved successfully', 'success');

                    // Clear the preview and reset data
                    this.showPreview = false;
                    this.menuItemMap = {};
                    this.scheduleTimeMap = {};
                    this.dailyMenuItems = [];
                    this.menuItems = [];
                    this.loading = false;

                    this.showPreview = false;

                    // Force refresh by recreating the preview after a short delay
                    /* setTimeout(() => {
                         this.forceRefresh();
                     }, 500);*/
                } else {
                    this.loading = false;
                    this.showToast('Error', 'Failed to save menu', 'error');
                }
            })
            .catch(error => {
                console.error('Error saving menu:', error);
                this.loading = false;
                this.showToast('Error', 'Failed to save menu: ' + (error.body ? error.body.message : error.message), 'error');
            });
    }

    // Method to force refresh data from server without any cache
    forceRefresh() {
        this.loading = true;

        // First, make sure any wire adapters will refresh by adding a timestamp parameter
        const refreshToken = new Date().getTime();

        // Call the getDailyMenuItems with fresh parameter to avoid cache
        getDailyMenuItems({
            menuId: this.selectedMenuId,
            messId: this.selectedMessId,
            startDate: this.startDate,
            endDate: this.endDate,
            refreshToken: refreshToken
        })
            .then(dailyItems => {
                // Store the fresh data
                this.dailyMenuItems = dailyItems || [];
                console.log('Refreshed daily items: ', this.dailyMenuItems.length);

                // Now fetch menu items
                return getMenuItems({
                    menuId: this.selectedMenuId,
                    refreshToken: refreshToken
                });
            })
            .then(templateItems => {
                this.menuItems = templateItems || [];

                // Process data with fresh items
                this.processData();
                this.loading = false;
                this.showPreview = true;

                // Render UI after data processing
                setTimeout(() => {
                    this.populateCells();
                    this.ensureHorizontalScroll();
                    this.addEditIcons();
                }, 0);
            })
            .catch(error => {
                console.error('Error refreshing data:', error);
                this.loading = false;
                this.showToast('Error', 'Failed to refresh menu data', 'error');
            });
    }


    // Prepare data for saving to Menu_Order__c
    prepareMenuOrderRecords() {
        const records = [];

        // Process all displayed days
        this.displayedDays.forEach(dayInfo => {
            const day = dayInfo.dayOfWeek;
            const formattedDay = dayInfo.formattedDayMonth;

            // Parse the formatted day to create a valid Date object
            const dateParts = formattedDay.split('-');
            const dateStr = `20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // Convert to YYYY-MM-DD

            // Process each menu type
            this.orderedMenuTypes.forEach(menuType => {
                // First try to find a specific date-based time
                const specificKey = `${menuType}|${day}|${formattedDay}`;
                const baseKey = `${menuType}|${day}`;

                // Use specific time if available, otherwise fall back to day-based time
                const timeValue = this.scheduleTimeMap[specificKey] || this.scheduleTimeMap[baseKey];

                if (!timeValue) return; // Skip if no time value

                // Parse time value to extract start and end times
                const timeParts = timeValue.split(' - ');
                if (timeParts.length !== 2) return; // Skip if time format is invalid

                const startTime = timeParts[0].trim();
                const endTime = timeParts[1].trim();

                // Process each category
                this.categories.forEach(category => {
                    const key = `${menuType}|${day}|${formattedDay}|${category}`;
                    const items = this.menuItemMap[key] || [];

                    // Create a record for each item (except placeholders)
                    items.forEach(item => {
                        if (item !== '-') {
                            records.push({
                                MenuId: this.selectedMenuId,
                                Day: day,
                                DateStr: dateStr,
                                Type: menuType,
                                StartTime: startTime,
                                EndTime: endTime,
                                Category: category,
                                Item: item,
                                RecordType: 'Daily Menu',
                                MessId: this.selectedMessId
                            });
                        }
                    });
                });
            });
        });

        return records;
    }

    // Ensure horizontal scrolling is needed and visible
    ensureHorizontalScroll() {
        const tableContainer = this.template.querySelector('.menu-table-container');
        const table = this.template.querySelector('.menu-table');
        const scrollIndicator = this.template.querySelector('.scroll-indicator');
    
        if (tableContainer && table) {
            // Get the number of displayed days
            const numDays = this.displayedDays.length;
            
            // Set minimum width based on number of columns
            const minColumnWidth = 140; // Match the CSS definition
            const numColumns = numDays + 1; // +1 for the label column
            const calculatedWidth = numColumns * minColumnWidth;
            
            // Get container width
            const containerWidth = tableContainer.clientWidth;
            
            // Check if we need to force scrolling or not
            if (numDays <= 2) {
                // For 2 or fewer days, don't force scrolling
                table.style.minWidth = '';
                table.classList.add('few-days');
                
                // Hide scroll indicator
                if (scrollIndicator) {
                    scrollIndicator.style.display = 'none';
                }
            } else if (calculatedWidth > containerWidth) {
                // For more days than fit in the container, force scrolling
                table.style.minWidth = `${calculatedWidth}px`;
                table.classList.remove('few-days');
                
                // Show scroll indicator
                if (scrollIndicator) {
                    scrollIndicator.style.display = 'flex';
                }
            } else {
                // For edge cases where there's just enough days to fit but we want to ensure good spacing
                table.style.minWidth = '100%';
                table.classList.add('few-days');
                
                // Hide scroll indicator if not needed
                if (scrollIndicator) {
                    scrollIndicator.style.display = 'none';
                }
            }
        }
    }

    generateDateRange(startDate, endDate) {
        const dates = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }

    getDayOfWeek(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }

    formatDate(date) {
        return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    }

    getMonthShort(date) {
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        return months[date.getMonth()];
    }

    handleCancel() {
        // Reset the preview
        this.showPreview = false;
    }

    // Format time values
    formatTimeValue(timeValue) {
        if (!timeValue) return '';

        // If timeValue is a number (milliseconds since midnight)
        if (typeof timeValue === 'number') {
            // Convert milliseconds to hours and minutes
            const totalMinutes = Math.floor(timeValue / 60000);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            // Format as HH:MM AM/PM
            let period = 'AM';
            let displayHours = hours;

            if (hours >= 12) {
                period = 'PM';
                if (hours > 12) {
                    displayHours = hours - 12;
                }
            }

            if (displayHours === 0) {
                displayHours = 12;
            }

            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        }

        // If timeValue is already a formatted string
        else if (typeof timeValue === 'string') {
            // Check if it's already properly formatted
            if (timeValue.includes(':') && (timeValue.includes('AM') || timeValue.includes('PM'))) {
                return timeValue;
            }

            // Otherwise try to parse and format it
            try {
                // This assumes timeValue might be in format like "09:00:00.000Z"
                const timeParts = timeValue.split(':');
                let hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);

                let period = 'AM';
                if (hours >= 12) {
                    period = 'PM';
                    if (hours > 12) {
                        hours -= 12;
                    }
                }

                if (hours === 0) {
                    hours = 12;
                }

                return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
            } catch (error) {
                console.error('Error parsing time string:', error);
                return timeValue; // Return original value if parsing fails
            }
        }

        return timeValue; // Return as is if we can't determine the format
    }

    // Show toast notification
    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(evt);
    }

    connectedCallback() {
        // Component initialization
    }

    // Exit edit mode - clear inputs and new item entry forms
    exitEditMode() {
        // Remove editing class from all cells
        const editingCells = this.template.querySelectorAll('.editing');
        editingCells.forEach(cell => {
            cell.classList.remove('editing');
        });
    
        // Remove action buttons from header
        const actionButtons = this.template.querySelector('.edit-actions');
        if (actionButtons) {
            actionButtons.remove();
        }
    
        // Remove any new item input containers
        const newItemContainers = this.template.querySelectorAll('.new-item-container');
        newItemContainers.forEach(container => {
            container.remove();
        });
    
        // Remove add item buttons
        const addItemContainers = this.template.querySelectorAll('.add-item-container');
        addItemContainers.forEach(container => {
            container.remove();
        });
    
        this.editingColumn = null;
    }

    

    // Handle column edit - now using both day name and formatted date
    async handleColumnEdit(dayOfWeek, formattedDay) {
        // Check if already editing a column with unsaved changes
        if (this.editingColumn && this.hasUnsavedChanges) {
            // Show confirmation dialog
            const result = await LightningConfirm.open({
                message: 'You have unsaved changes. Discard changes and edit new column?',
                label: 'Unsaved Changes',
                theme: 'warning'
            });
    
            if (!result) {
                // User clicked Cancel, stay in current column
                return;
            }
            // User clicked OK, continue to new column
            this.cancelColumnEdit();
        } else if (this.editingColumn) {
            // No unsaved changes, just cancel current edit
            this.cancelColumnEdit();
        }
    
        this.editingColumn = formattedDay; // Store the formatted day which is unique
        this.hasUnsavedChanges = false; // Reset unsaved changes flag
    
        // Add edit mode class to all cells for this specific day and formatted day
        const dayCells = this.template.querySelectorAll(`td[data-day="${dayOfWeek}"][data-formattedday="${formattedDay}"]`);
        dayCells.forEach(cell => {
            cell.classList.add('editing');
    
            // For time cells, make them editable
            if (cell.classList.contains('time-cell')) {
                const menuType = cell.dataset.menutype;
                const day = cell.dataset.day;
                const formattedDay = cell.dataset.formattedday;
    
                // First try to find a specific date-based time
                const specificKey = `${menuType}|${day}|${formattedDay}`;
                const baseKey = `${menuType}|${day}`;
    
                // Use specific time if available, otherwise fall back to day-based time
                const originalTime = this.scheduleTimeMap[specificKey] || this.scheduleTimeMap[baseKey] || '';
    
                // Clear cell and add input
                cell.innerHTML = '';
    
                const timeInput = document.createElement('input');
                timeInput.type = 'text';
                timeInput.className = 'time-edit-input';
                timeInput.value = originalTime;
                timeInput.dataset.originalValue = originalTime;
                timeInput.dataset.menutype = menuType;
                timeInput.dataset.day = day;
                timeInput.dataset.formattedday = formattedDay;
    
                // Add change event to detect modifications
                timeInput.addEventListener('input', () => {
                    this.hasUnsavedChanges = true;
                });
    
                cell.appendChild(timeInput);
            }
    
            // For item cells, add checkboxes instead of delete icons
            if (cell.classList.contains('item-cell')) {
                const menuType = cell.dataset.menutype;
                const day = cell.dataset.day;
                const formattedDay = cell.dataset.formattedday;
                const category = cell.dataset.category;
    
                const itemEntries = cell.querySelectorAll('.menu-item-entry');
                itemEntries.forEach(itemDiv => {
                    // Only add checkbox if not a placeholder
                    if (itemDiv.textContent !== '-') {
                        const itemContent = itemDiv.textContent;
    
                        // Clear the current content
                        itemDiv.innerHTML = '';
    
                        // Create checkbox container
                        const checkboxContainer = document.createElement('div');
                        checkboxContainer.className = 'checkbox-container';
    
                        // Create checkbox
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.className = 'item-checkbox';
                        checkbox.checked = true; // Default to checked
    
                        // Add event listener for checkbox
                        checkbox.addEventListener('change', (event) => {
                            if (checkbox.checked) {
                                itemDiv.classList.remove('unchecked');
                            } else {
                                itemDiv.classList.add('unchecked');
                            }
                            this.hasUnsavedChanges = true;
                        });
    
                        // Create label for item
                        const itemLabel = document.createElement('span');
                        itemLabel.className = 'item-label';
                        itemLabel.textContent = itemContent;
    
                        // Assemble checkbox and label
                        checkboxContainer.appendChild(checkbox);
                        checkboxContainer.appendChild(itemLabel);
                        itemDiv.appendChild(checkboxContainer);
                    }
                });
    
                // Add the "+" button to add new items
                const addButtonContainer = document.createElement('div');
                addButtonContainer.className = 'add-item-container';
    
                const addButton = document.createElement('button');
                addButton.className = 'add-item-btn';
                addButton.innerHTML = '+';
                addButton.title = 'Add new item';
    
                // Add data attributes for reference
                addButton.dataset.menutype = menuType;
                addButton.dataset.day = day;
                addButton.dataset.formattedday = formattedDay;
                addButton.dataset.category = category;
    
                // Add click handler for the "+" button
                addButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.handleAddNewItem(event.target);
                });
    
                addButtonContainer.appendChild(addButton);
                cell.appendChild(addButtonContainer);
            }
        });
    
        // Find the header cell for this specific day and formatted day combination
        const headerCells = this.template.querySelectorAll('th.day-col');
        let headerCell;
    
        headerCells.forEach(cell => {
            const cellDayText = cell.querySelector('.day-name').textContent;
            const cellFormattedDay = cell.querySelector('.day-formatted').textContent;
            if (cellDayText === dayOfWeek && cellFormattedDay === formattedDay) {
                headerCell = cell;
            }
        });
    
        if (!headerCell) return; // Safety check
    
        // Add save/cancel buttons to the header
        const actionButtons = document.createElement('div');
        actionButtons.className = 'edit-actions';
    
        const saveButton = document.createElement('button');
        saveButton.className = 'edit-action-btn save-btn';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.saveColumnEdit(dayOfWeek, formattedDay);
        });
    
        const cancelButton = document.createElement('button');
        cancelButton.className = 'edit-action-btn cancel-btn';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.cancelColumnEdit();
        });
    
        actionButtons.appendChild(saveButton);
        actionButtons.appendChild(cancelButton);
        headerCell.appendChild(actionButtons);
    }
    

    // New method to handle adding a new item
    handleAddNewItem(buttonElement) {
        // Get the parent cell
        const parentCell = buttonElement.closest('.item-cell');
        const menuType = buttonElement.dataset.menutype;
        const day = buttonElement.dataset.day;
        const formattedDay = buttonElement.dataset.formattedday;
        const category = buttonElement.dataset.category;
    
        // Create a new input container
        const newItemContainer = document.createElement('div');
        newItemContainer.className = 'new-item-container';
    
        // Create input field
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.className = 'new-item-input';
        inputField.placeholder = 'Type new item name';
    
        // Add data attributes
        inputField.dataset.menutype = menuType;
        inputField.dataset.day = day;
        inputField.dataset.formattedday = formattedDay;
        inputField.dataset.category = category;
    
        // Add change listener
        inputField.addEventListener('input', () => {
            this.hasUnsavedChanges = true;
        });
    
        // Add confirm button
        const confirmButton = document.createElement('button');
        confirmButton.className = 'confirm-new-item-btn';
        confirmButton.innerHTML = '✓';
        confirmButton.title = 'Confirm new item';
    
        // Add cancel button
        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-new-item-btn';
        cancelButton.innerHTML = '✕';
        cancelButton.title = 'Cancel';
    
        // Add event listeners
        confirmButton.addEventListener('click', () => {
            const newItemValue = inputField.value.trim();
    
            if (newItemValue) {
                // Create a new menu item entry
                this.addNewMenuItemToCell(parentCell, {
                    menuType,
                    day,
                    formattedDay,
                    category,
                    itemName: newItemValue
                });
    
                // Remove the input container
                newItemContainer.remove();
            }
        });
    
        cancelButton.addEventListener('click', () => {
            // Just remove the input container
            newItemContainer.remove();
        });
    
        // Enter key should also confirm
        inputField.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                confirmButton.click();
            } else if (event.key === 'Escape') {
                cancelButton.click();
            }
        });
    
        // Assemble the container
        newItemContainer.appendChild(inputField);
        newItemContainer.appendChild(confirmButton);
        newItemContainer.appendChild(cancelButton);
    
        // Add it to the cell
        parentCell.appendChild(newItemContainer);
    
        // Focus the input
        inputField.focus();
    }
    

    // Add the new item to the cell and data structure
    addNewMenuItemToCell(cell, itemData) {
        const { menuType, day, formattedDay, category, itemName } = itemData;
    
        // Create a new menu item entry
        const newItemDiv = document.createElement('div');
        newItemDiv.className = 'menu-item-entry new-item'; // Add a class to identify new items
    
        // Create checkbox container
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-container';
    
        // Create checkbox (checked by default for new items)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'item-checkbox';
        checkbox.checked = true;
    
        // Add event listener for checkbox
        checkbox.addEventListener('change', (event) => {
            if (checkbox.checked) {
                newItemDiv.classList.remove('unchecked');
            } else {
                newItemDiv.classList.add('unchecked');
            }
            this.hasUnsavedChanges = true;
        });
    
        // Create label for new item
        const itemLabel = document.createElement('span');
        itemLabel.className = 'item-label';
        itemLabel.textContent = itemName;
    
        // Assemble checkbox and label
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(itemLabel);
        newItemDiv.appendChild(checkboxContainer);
    
        // Add data attributes for identifying this item
        newItemDiv.dataset.menutype = menuType;
        newItemDiv.dataset.day = day;
        newItemDiv.dataset.formattedday = formattedDay;
        newItemDiv.dataset.category = category;
        newItemDiv.dataset.item = itemName;
        newItemDiv.dataset.isnew = 'true'; // Mark as a newly added item
    
        // Add it to the cell, before the add button container
        const addButtonContainer = cell.querySelector('.add-item-container');
        cell.insertBefore(newItemDiv, addButtonContainer);
    
        // Also update the internal data structure
        const key = `${menuType}|${day}|${formattedDay}|${category}`;
    
        if (!this.menuItemMap[key]) {
            this.menuItemMap[key] = [];
        }
    
        // If there's only a placeholder, replace it
        if (this.menuItemMap[key].length === 1 && this.menuItemMap[key][0] === '-') {
            this.menuItemMap[key] = [itemName];
        } else {
            // Otherwise add to the existing items
            this.menuItemMap[key].push(itemName);
        }
    
        // Mark that we have unsaved changes
        this.hasUnsavedChanges = true;
    }
    

    // Save column edits - updated to handle new items
    saveColumnEdit(dayOfWeek, formattedDay) {
        if (!this.editingColumn) return;
    
        // Process time cell edits
        const timeInputs = this.template.querySelectorAll(`.time-edit-input[data-day="${dayOfWeek}"][data-formattedday="${formattedDay}"]`);
        timeInputs.forEach(input => {
            const menuType = input.dataset.menutype;
            const day = input.dataset.day;
            const formattedDay = input.dataset.formattedday;
    
            // Use specific key with formatted day
            const specificKey = `${menuType}|${day}|${formattedDay}`;
            const newValue = input.value.trim();
    
            // Update the time map with new value for specific date
            this.scheduleTimeMap[specificKey] = newValue;
        });
    
        // Process item deletions (unchecked items)
        const uncheckedItems = this.template.querySelectorAll(`.menu-item-entry.unchecked[data-day="${dayOfWeek}"][data-formattedday="${formattedDay}"]`);
        uncheckedItems.forEach(itemDiv => {
            const menuType = itemDiv.dataset.menutype;
            const day = itemDiv.dataset.day;
            const formattedDay = itemDiv.dataset.formattedday;
            const category = itemDiv.dataset.category;
            const item = itemDiv.dataset.item;
            const key = `${menuType}|${day}|${formattedDay}|${category}`;
    
            // Remove this item from the menuItemMap
            if (this.menuItemMap[key] && this.menuItemMap[key].includes(item)) {
                this.menuItemMap[key] = this.menuItemMap[key].filter(i => i !== item);
    
                // If no items left, add placeholder
                if (this.menuItemMap[key].length === 0) {
                    this.menuItemMap[key] = ['-'];
                }
            }
        });
    
        // Reset unsaved changes flag
        this.hasUnsavedChanges = false;
    
        // Exit edit mode and rerender cells
        this.exitEditMode();
        this.populateCells();
    }

    // Exit edit mode - clear inputs and new item entry forms
    exitEditMode() {
        // Remove editing class from all cells
        const editingCells = this.template.querySelectorAll('.editing');
        editingCells.forEach(cell => {
            cell.classList.remove('editing');
        });

        // Remove action buttons from header
        const actionButtons = this.template.querySelector('.edit-actions');
        if (actionButtons) {
            actionButtons.remove();
        }

        // Remove any new item input containers
        const newItemContainers = this.template.querySelectorAll('.new-item-container');
        newItemContainers.forEach(container => {
            container.remove();
        });

        // Remove add item buttons
        const addItemContainers = this.template.querySelectorAll('.add-item-container');
        addItemContainers.forEach(container => {
            container.remove();
        });

        this.editingColumn = null;
    }

    get showMessAdminButtons() {
        console.log('selectedMenuStatus:::', this.selectedMenuStatus);
        return this.hasMessAdminPermission && this.selectedMenuId && this.selectedMenuStatus !== 'Approved';
    }

    // Open modal with dynamic title
    openModal(event) {
        this.actionType = event.target.dataset.action;
        this.modalTitle = this.actionType === 'Approved' ? 'Approve Reason' : 'Reject Reason';
        this.isModalOpen = true;
    }

    // Close modal
    closeModal() {
        this.isModalOpen = false;
        this.comment = '';
    }

    // Handle textarea input
    handleCommentChange(event) {
        this.comment = event.target.value;
    }

    //Save data to Menu__c
    async saveComment(){

        try {
            this.loading = true;
            if (!this.comment.trim() && this.actionType === 'Reject') {
                this.showToast('Error', 'Comment cannot be empty for Reject Action', 'error');
                return;
            }
    
            // Create the recordInput object
            const fields = {};
            fields[MENU_ID.fieldApiName] = this.selectedMenuId;
            fields[APPROVAL_STATUS.fieldApiName] = this.actionType;
            fields[MENU_COMMENTS.fieldApiName] = this.comment;
    
            await updateRecord({fields});
            await refreshApex(this.menuResult);
            this.showToast('Success', `Menu ${this.actionType} successfully!`, 'success');

        } catch(error) {
            console.error('Error Occurred while Saving:::', JSON.stringify(error));
            this.showToast('Error', 'Error occurred while saving', 'error');

        } finally {
            this.isModalOpen = false;
            this.loading = false;
        }
        


    }

    renderedCallback() {
        // This will run after each render to ensure our UI is consistent
        
        // 1. Ensure the yellow vertical line is maintained
        const allFirstCells = this.template.querySelectorAll('.menu-table td:first-child, .menu-table th:first-child');
        allFirstCells.forEach(cell => {
            cell.classList.add('sticky-first-column');
        });
        
        // 2. Check if we need to adjust scrolling behavior
        if (this.showPreview) {
            this.ensureHorizontalScroll();
        }
    }
    

    positionVerticalDivider() {
        // First, remove any existing divider to avoid duplicates
        const existingDivider = this.template.querySelector('.vertical-divider');
        if (existingDivider) {
            existingDivider.remove();
        }
        
        // Get the table container and first column
        const tableContainer = this.template.querySelector('.menu-table-container');
        const firstColumn = this.template.querySelector('.menu-table td:first-child');
        
        if (tableContainer && firstColumn) {
            // Create the divider
            const divider = document.createElement('div');
            divider.className = 'vertical-divider';
            
            // Get the position of the first column
            const containerRect = tableContainer.getBoundingClientRect();
            const firstColumnRect = firstColumn.getBoundingClientRect();
            
            // Position the divider at the right edge of the first column
            const dividerLeft = firstColumnRect.right - containerRect.left + tableContainer.scrollLeft;
            
            // Set the divider position
            divider.style.left = `${dividerLeft}px`;
            divider.style.top = `${containerRect.top}px`;
            divider.style.height = `${containerRect.height}px`;
            
            // Add the divider to the container
            tableContainer.appendChild(divider);
        }
    }


}