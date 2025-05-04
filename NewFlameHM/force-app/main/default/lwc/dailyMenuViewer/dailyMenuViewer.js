import { LightningElement, api, wire, track } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import getDailyMenu from '@salesforce/apex/DailyMenuController.getDailyMenu';
import getMenuItemDetails from '@salesforce/apex/DailyMenuController.getMenuItemDetails';

export default class DailyMenuViewer extends LightningElement {

    @api messId;
    @api selectedDate;
    @track menuId={};

    @track menuData = {
        Breakfast: { items: [], startTime: '', endTime: '' },
        Lunch: { items: [], startTime: '', endTime: '' },
        EveningSnacks: { items: [], startTime: '', endTime: '' },
        Dinner: { items: [], startTime: '', endTime: '' }
    };
    
    @track menuItemDetails = {};
    isLoading = true;
    error;
    isItemsPresent= false;

    connectedCallback() {
        console.log('inside connected callback:::');
        console.log('messId::' , this.messId);
        console.log('selectedDate::', this.selectedDate);
        if (this.messId && this.selectedDate) {
            this.loadMenuData();
        }
    }

    @api
    refresh() {
        this.loadMenuData();
    }

    async loadMenuData() {
        this.isLoading = true;
        try {
            // Get daily menu data
            const menuResults = await getDailyMenu({
                messId: this.messId,
                selectedDate: this.selectedDate
            });

            console.log('menuResults:::', JSON.stringify(menuResults));
            
            // Reset menu data
            this.resetMenuData();
            
            // Process menu data
            if (menuResults && menuResults.length > 0) {
                this.isItemsPresent = true;
                // Extract all unique item names to fetch their details
                const itemNames = [];
                menuResults.forEach(item => {
                    if (item.Item__c) {
                        itemNames.push(item.Item__c);
                    }
                });
                
                // Remove duplicates
                const uniqueItemNames = [...new Set(itemNames)];
                console.log('items:::', JSON.stringify(uniqueItemNames));
                
                // Get item details in parallel
                const itemDetailsResults = await getMenuItemDetails({
                    itemNames: uniqueItemNames
                });

                console.log('itemDetailsResults11:::', JSON.stringify(itemDetailsResults));
                
                // Convert array to map for easier lookup
                const itemDetailsMap = {};
                if (itemDetailsResults && itemDetailsResults.length > 0) {
                    itemDetailsResults.forEach(item => {
                        if (item.Name) {
                            itemDetailsMap[item.Name] = item;
                        }
                    });
                }
                this.menuItemDetails = itemDetailsMap;

                console.log('menuItemDetails:::', JSON.stringify(this.menuItemDetails));
                
                // Process menu items
                menuResults.forEach(menuItem => {
                    if (!menuItem || !menuItem.Type__c) return;
                    
                    const mealType = menuItem.Type__c;
                    // Map "Evening snacks" to "EveningSnacks" for JS property access
                    const mealTypeKey = (mealType === 'Evening snacks' || mealType === 'Snacks') ? 'EveningSnacks' : mealType;
                    this.menuId[mealTypeKey] = menuItem.Menu_Id__c;
                    console.log('this.MenuId--',JSON.stringify(this.menuId));
                    console.log('mealTypeKey:::', mealTypeKey);
                    
                    if (this.menuData[mealTypeKey]) {
                        console.log('inside if1:::');
                        console.log('menuItem.Start_Time__c:::' , menuItem.Start_Time__c);
                        // Set time if not already set
                        if (!this.menuData[mealTypeKey].startTime && menuItem.Start_Time__c) {
                            console.log('inside if123:::');
                            this.menuData[mealTypeKey].startTime = this.formatTime(menuItem.Start_Time__c);
                        }
                        if (!this.menuData[mealTypeKey].endTime && menuItem.End_Time__c) {
                            console.log('inside if321:::');
                            this.menuData[mealTypeKey].endTime = this.formatTime(menuItem.End_Time__c);
                        }

                        console.log('inside if 2:::');
                        
                        // Add item
                        const itemDetails = menuItem.Item__c ? (this.menuItemDetails[menuItem.Item__c] || {}) : {};
                        
                        // Determine food type - Checking both fields for compatibility
                        const isJain = itemDetails.Meal_Type__c === 'Jain';
                        const isVeg = itemDetails.Meal_Type__c === 'Veg';
                        const isNonVeg = itemDetails.Meal_Type__c === 'Non-Veg';
                        
                        this.menuData[mealTypeKey].items.push({
                            id: menuItem.Id,
                            name: menuItem.Item__c,
                            category: menuItem.Category__c,
                            isJain: isJain,
                            isVeg: isVeg,
                            isNonVeg: isNonVeg,
                            nutritionInfo: {
                                calories: itemDetails.Calories_kcal__c,
                                carbs: itemDetails.Carbs__c,
                                fat: itemDetails.Fat__c,
                                protein: itemDetails.Protein__c,
                                sugar: itemDetails.Sugar__c
                            },
                            isNutrition: !!(
                                itemDetails.Calories_kcal__c ||
                                itemDetails.Carbs__c ||
                                itemDetails.Fat__c ||
                                itemDetails.Protein__c ||
                                itemDetails.Sugar__c
                            ) 
                        });
                    }
                });

                console.log('this.menuData final:::' , JSON.stringify(this.menuData));
            }
        } catch (error) {
            this.error = error;
            console.error('Error loading menu data', JSON.stringify(error));
        } finally {
            this.isLoading = false;
        }
    }
    
    resetMenuData() {
        this.menuData = {
            Breakfast: { items: [], startTime: '', endTime: '' },
            Lunch: { items: [], startTime: '', endTime: '' },
            EveningSnacks: { items: [], startTime: '', endTime: '' },
            Dinner: { items: [], startTime: '', endTime: '' }
        };
    }
   /* 
    formatTime(timeString) {
        if (!timeString) return '';
        
        // Parse time string (assumed to be in HH:MM:SS format)
        const timeParts = timeString.split(':');
        if (timeParts.length < 2) return timeString;
        
        let hours = parseInt(timeParts[0], 10);
        const minutes = timeParts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        // Convert to 12-hour format
        hours = hours % 12;
        hours = hours ? hours : 12; // Convert '0' to '12'
        
        return `${hours}:${minutes} ${ampm}`;
    }*/ 

        formatTime(timeValue) {
    if (!timeValue) return '';
    
    try {
        // Check if timeValue is a number (milliseconds) or already a string
        let timeString = String(timeValue);
        
        // Case 1: If it's a large number like 72000000 (milliseconds since midnight)
        if (!isNaN(timeValue) && timeValue > 1000) {
            // Convert milliseconds to hours, minutes, seconds
            const totalSeconds = Math.floor(timeValue / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            // Format as HH:MM:SS
            timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Case 2: Handle HH:MM:SS format
        const timeParts = timeString.split(':');
        if (timeParts.length >= 2) {
            let hours = parseInt(timeParts[0], 10);
            if (isNaN(hours)) return timeValue; // Return original if parsing fails
            
            const minutes = timeParts[1].padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            // Convert to 12-hour format
            hours = hours % 12;
            hours = hours ? hours : 12; // Convert '0' to '12'
            
            return `${hours}:${minutes} ${ampm}`;
        }
        
        // Case 3: Handle Salesforce time fields that might be seconds since midnight
        if (!isNaN(timeValue) && timeValue < 86400) {
            const hours = Math.floor(timeValue / 3600);
            const minutes = Math.floor((timeValue % 3600) / 60);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            // Convert to 12-hour format
            const hours12 = hours % 12;
            const displayHours = hours12 ? hours12 : 12; // Convert '0' to '12'
            
            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        }
        
        // Fallback: return original value if we can't parse it
        return timeValue;
    } catch (error) {
        console.error('Error formatting time:', error);
        return timeValue; // Return original value if there's an error
    }
}
    
    // Method to handle rating the menu
    handleRateMenu(event) {
        const mealType = event.currentTarget.dataset.mealtype;
        // Implement your rating logic here
        console.log(`Rating ${mealType} menu`);
    }
}