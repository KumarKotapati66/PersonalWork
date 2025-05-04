import { LightningElement, api, wire, track } from 'lwc';

import { getRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

/** Import Apex classes */
import getMenuItemsWithCategory from '@salesforce/apex/MessMenuController.getMenuItemsWithCategory';
import saveMenuMealSetup from '@salesforce/apex/MessMenuController.saveMenuMealSetup';

/** Import Fields */
import MENU_TYPE from '@salesforce/schema/Menu__c.Menu_Type__c';
import MENU_DAY from '@salesforce/schema/Menu__c.Day__c';
import MEAL_TYPE from '@salesforce/schema/Menu__c.Meal_Type__c';

export default class MenuMealSetup extends LightningElement {
    @api recordId;
    @track fields = [MENU_TYPE, MENU_DAY, MEAL_TYPE];
    @track menuDays = [];
    @track activeSectionNames = [];
    @track menuCategoriesForMultiSelect = [];
    @track allMenuItems = {};
    @track jsonOutput = '';
    @track showJsonOutput = false;
    @track isSaving = false;

    // Data structure to store all selections
    @track mealConfig = {};
    @track categoryItemsMap = {};
    @track menuTypeOptions = [];

    @track mealTypesFromMenu = [];

    @wire(getMenuItemsWithCategory, {mealTypes : '$mealTypesFromMenu'})
    menuCategoryMap({ data, error }) {
        if (data) {
            console.log('menuCategoryMap ::: ', JSON.stringify(data));
            this.allMenuItems = data;
            
            // Generate categories for multi-select
            this.menuCategoriesForMultiSelect = Object.keys(data).map(item => {
                return {
                    label: item,
                    value: item
                };
            });

            // Build a map of categories to their items for easier lookup
            this.categoryItemsMap = {};
            Object.keys(data).forEach(category => {
                // Check if data[category] is an array and has the expected structure
                if (Array.isArray(data[category])) {
                    this.categoryItemsMap[category] = data[category].map(item => {
                        // Handle different possible data structures
                        if (item.id && item.name) {
                            return {
                                label: item.name,
                                value: item.id
                            };
                        } else if (typeof item === 'string') {
                            return {
                                label: item,
                                value: item
                            };
                        } else {
                            // For unexpected structures, create a fallback
                            return {
                                label: String(item),
                                value: String(item)
                            };
                        }
                    });
                }
            });

        } else if (error) {
            console.error('Error loading menuCategoryMap: ', JSON.stringify(error));
        }
    }

    @wire(getRecord, { recordId: '$recordId', fields: '$fields' })
    getMenuRecordDetails({ data, error }) {
        if (data) {
            console.log('menu record :::', JSON.stringify(data));
            const rawMenuDays = data?.fields?.Day__c?.value?.split(';') || [];
            this.menuDays = rawMenuDays;
            this.activeSectionNames = [...rawMenuDays];
            
            // Initialize mealConfig structure for all days
            rawMenuDays.forEach(day => {
                this.mealConfig[day] = {
                    selectedMealTypes: [],
                    mealTypeConfigs: {}
                };
            });

            this.menuTypeOptions = data?.fields?.Menu_Type__c?.value?.split(';').map(item => ({
                label: item,
                value: item
            }));

            console.log('this.menuTypeOptions:::', JSON.stringify(this.menuTypeOptions));

            this.mealTypesFromMenu = data?.fields?.Meal_Type__c?.value?.split(';');

            console.log('this.mealTypesFromMenu:::', JSON.stringify(this.mealTypesFromMenu));

        } else if (error) {
            console.error('Error loading menu data: ', JSON.stringify(error));
        }
    }

    // Process menu days to include all required data for rendering
    get processedMenuDays() {
        if (!this.menuDays.length) return [];

        return this.menuDays.map(day => {
            const dayConfig = this.mealConfig[day] || { 
                selectedMealTypes: [], 
                mealTypeConfigs: {} 
            };
            
            // Create the processed day object
            const processedDay = {
                name: day,
                selectedMealTypes: [] // Will be array of meal type objects, not just strings
            };
            
            // Process each meal type separately with its own properties
            if (dayConfig.selectedMealTypes && dayConfig.selectedMealTypes.length > 0) {
                processedDay.selectedMealTypes = dayConfig.selectedMealTypes.map(mealTypeName => {
                    const mealTypeConfig = dayConfig.mealTypeConfigs[mealTypeName] || {
                        selectedCategories: [],
                        selectedItems: []
                    };
                    
                    // Create meal type object with all needed properties
                    const mealType = {
                        value: mealTypeName, // Used as key and display name
                        label: mealTypeName, // For display purposes
                        selectedCategories: mealTypeConfig.selectedCategories || [],
                        selectedItems: mealTypeConfig.selectedItems || [],
                        hasCategorySelections: (mealTypeConfig.selectedCategories || []).length > 0,
                        menuItemOptions: []
                    };
                    
                    // Get available menu items for this meal type's selected categories
                    if (mealType.selectedCategories && mealType.selectedCategories.length > 0) {
                        // CRITICAL CHANGE: Build the complete list of all menu items from all categories
                        let allItems = [];
                        
                        // Collect all items from all selected categories
                        mealType.selectedCategories.forEach(category => {
                            if (this.categoryItemsMap[category]) {
                                allItems = [...allItems, ...this.categoryItemsMap[category]];
                            }
                        });
                        
                        // Create a map to deduplicate items by value
                        const uniqueItems = {};
                        allItems.forEach(item => {
                            uniqueItems[item.value] = item;
                        });
                        
                        // CRITICAL CHANGE: For dual-listbox, we need ALL options, including already selected items
                        // The dual-listbox will automatically show items in the correct side based on the value array
                        mealType.menuItemOptions = Object.values(uniqueItems);
                    }
                    
                    return mealType;
                });
            }
            
            return processedDay;
        });
    }

    handleSectionToggle(event) {
        this.activeSectionNames = event.detail.openSections;
    }

    handleCheckboxChange(event) {
        const day = event.target.dataset.day;
        const checked = event.target.checked;
        const mealType = event.target.dataset.name;

        console.log(`${day} ::: ${mealType} ::: ${checked}`);

        // Initialize structure if not exist
        if (!this.mealConfig[day]) {
            this.mealConfig[day] = {
                selectedMealTypes: [],
                mealTypeConfigs: {}
            };
        }

        if (checked) {
            // Add meal type if not already in the array
            if (!this.mealConfig[day].selectedMealTypes.includes(mealType)) {
                this.mealConfig[day].selectedMealTypes.push(mealType);
                
                // Initialize config for this meal type
                this.mealConfig[day].mealTypeConfigs[mealType] = {
                    selectedCategories: [],
                    selectedItems: []
                };
            }
        } else {
            // Remove meal type from the array
            this.mealConfig[day].selectedMealTypes = this.mealConfig[day].selectedMealTypes
                .filter(type => type !== mealType);
                
            // Remove meal type config
            delete this.mealConfig[day].mealTypeConfigs[mealType];
        }

        // Force reactive update by creating a new object reference
        this.mealConfig = JSON.parse(JSON.stringify(this.mealConfig));
    }

    handleCategoryChange(event) {
        const day = event.target.dataset.day;
        const mealType = event.target.dataset.mealtype;
        const selectedCategories = event.detail.value || [];
        
        console.log(`Category Change - Day: ${day}, Meal Type: ${mealType}, Selected:`, selectedCategories);
        
        // Ensure the structure exists
        if (!this.mealConfig[day]) {
            this.mealConfig[day] = {
                selectedMealTypes: [mealType],
                mealTypeConfigs: {}
            };
        }
        
        if (!this.mealConfig[day].mealTypeConfigs[mealType]) {
            this.mealConfig[day].mealTypeConfigs[mealType] = {
                selectedCategories: [],
                selectedItems: []
            };
        }
        
        // Update selected categories
        this.mealConfig[day].mealTypeConfigs[mealType].selectedCategories = selectedCategories;
        
        // CRITICAL FIX: DO NOT reset selected items when categories change
        // this.mealConfig[day].mealTypeConfigs[mealType].selectedItems = [];
        
        // Force reactive update by creating a new object reference
        this.mealConfig = JSON.parse(JSON.stringify(this.mealConfig));

        console.log('handleCategoryChange final::::' , JSON.stringify(this.mealConfig));
    }

    handleItemChange(event) {
        const day = event.target.dataset.day;
        const mealType = event.target.dataset.mealtype;
        const selectedItems = event.detail.value || [];
        
        console.log(`Item Change - Day: ${day}, Meal Type: ${mealType}, Selected:`, selectedItems);
        
        // Ensure structure exists
        if (!this.mealConfig[day] || !this.mealConfig[day].mealTypeConfigs[mealType]) {
            return;
        }
        
        // Update selected items
        this.mealConfig[day].mealTypeConfigs[mealType].selectedItems = selectedItems;
        
        // Force reactive update by creating a new object reference
        this.mealConfig = JSON.parse(JSON.stringify(this.mealConfig));

        console.log('handleItemChange final::::' , JSON.stringify(this.mealConfig));
    }
    
    // Generate the final JSON output in the required format
    generateFinalOutput() {
        const outputArray = [];
        
        // Process each day's configuration
        Object.keys(this.mealConfig).forEach(day => {
            const dayConfig = this.mealConfig[day];
            
            // Process each meal type for this day
            dayConfig.selectedMealTypes.forEach(mealType => {
                const mealTypeConfig = dayConfig.mealTypeConfigs[mealType];
                
                if (mealTypeConfig && mealTypeConfig.selectedItems && mealTypeConfig.selectedItems.length > 0) {
                    // Add an entry for each selected item
                    mealTypeConfig.selectedItems.forEach(itemId => {
                        outputArray.push({
                            Day: day,
                            Menu: this.recordId,
                            MenuItemId: itemId,
                            Type: mealType
                        });
                    });
                }
            });
        });

        console.log('json array final::::' , JSON.stringify(outputArray));
        
        // Display the JSON - Debug Purpose. Dont Delete
       /* this.jsonOutput = JSON.stringify(outputArray, null, 2);
        this.showJsonOutput = true;
        console.log('Generated menu configuration:', this.jsonOutput);*/


        if (outputArray.length) {
            this.saveToDatabase(outputArray);
        } else {
            this.showToast('Warning', 'No menu items selected to save', 'warning');
        }
        
        return outputArray;
    }

    // Save the configuration to the database using the Apex method
    saveToDatabase(configArray) {
        // Show spinner
        this.isSaving = true;
        
        // Call the Apex method to save records
        saveMenuMealSetup({ menuConfigurations: configArray })
            .then(result => {
                console.log('Save result:', result);
                this.showToast('Success', 'Successfully Saved', 'success');
            })
            .catch(error => {
                console.error('Error saving records:', JSON.stringify(error));
                this.showToast('Error', 'Failed to save menu configurations: ' , 'error');
            })
            .finally(() => {
                this.isSaving = false;
            });
    }

    // Helper method to show toast notifications
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }
}