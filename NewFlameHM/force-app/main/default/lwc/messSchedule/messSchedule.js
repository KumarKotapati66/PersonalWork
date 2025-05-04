import { LightningElement, track, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import saveMessSchedule from '@salesforce/apex/MessScheduleController.saveMessSchedule';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';

export default class MessSchedule extends NavigationMixin(LightningElement) {
    @api recordId;
    @api menuType;
    @track menuOptions = [];
    
    @track days = [
        { name: 'Monday', open: false, meals: [{ mealName: '', startTime: '', endTime: '', mealType: '' }] },
        { name: 'Tuesday', open: false, meals: [{ mealName: '', startTime: '', endTime: '', mealType: '' }] },
        { name: 'Wednesday', open: false, meals: [{ mealName: '', startTime: '', endTime: '', mealType: '' }] },
        { name: 'Thursday', open: false, meals: [{ mealName: '', startTime: '', endTime: '', mealType: '' }] },
        { name: 'Friday', open: false, meals: [{ mealName: '', startTime: '', endTime: '', mealType: '' }] },
        { name: 'Saturday', open: false, meals: [{ mealName: '', startTime: '', endTime: '', mealType: '' }] },
        { name: 'Sunday', open: false, meals: [{ mealName: '', startTime: '', endTime: '', mealType: '' }] }
    ];

    connectedCallback() {
        // Parse the comma-separated string into an array of options
        if (this.menuType) {
            const menuTypesArray = this.menuType.split(',').map(item => item.trim());
            
            // Create the options array for the combobox
            this.menuOptions = menuTypesArray.map(menuItem => {
                return {
                    label: menuItem,
                    value: menuItem
                };
            });

            // Set default mealType and auto-populate meal name for initial meals
            this.days.forEach(day => {
                day.meals.forEach(meal => {
                    if (this.menuOptions.length > 0) {
                        meal.mealType = this.menuOptions[0].value;
                        meal.mealName = `${day.name}-${meal.mealType}`;
                    }
                });
            });
        }
    }

    toggleDay(event) {
        const index = event.target.dataset.index;
        this.days[index].open = !this.days[index].open;
    }

    handleMealTypeChange(event) {
        const { index, day } = event.target.dataset;
        const dayName = this.days[day].name;
        const mealType = event.target.value;
        
        // Update the meal type
        this.days[day].meals[index].mealType = mealType;
        
        // Auto-populate meal name as "Day-MealType"
        this.days[day].meals[index].mealName = `${dayName}-${mealType}`;
    }
    
    handleApplyToAllChange(event) {
        const dayIndex = parseInt(event.target.dataset.day, 10);
        const isChecked = event.target.checked;
        
        if (isChecked) {
            // Find the checkbox's closest meal container to get the meal index
            const mealContainer = event.target.closest('.slds-p-around_medium.slds-box');
            if (mealContainer) {
                const mealElements = Array.from(this.template.querySelectorAll('.slds-p-around_medium.slds-box[data-day="' + dayIndex + '"]'));
                const mealIndex = mealElements.indexOf(mealContainer);
                
                if (mealIndex !== -1) {
                    this.applyMealToAllDays(dayIndex, mealIndex);
                }
            }
        }
    }
    
    handleApplyToAllDays(event) {
        const dayIndex = parseInt(event.target.dataset.day, 10);
        const mealIndex = parseInt(event.target.dataset.index, 10);
        const isChecked = event.target.checked;
        
        if (isChecked) {
            this.applyMealToAllDays(dayIndex, mealIndex);
        }
    }
    
    applyMealToAllDays(sourceDayIndex, mealIndex) {
        const sourceMeal = this.days[sourceDayIndex].meals[mealIndex];
        const mealType = sourceMeal.mealType;
        const startTime = sourceMeal.startTime;
        const endTime = sourceMeal.endTime;
        
        // Skip if the source meal doesn't have the required fields
        if (!mealType || !startTime || !endTime) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Please fill in Meal Type, Start Time, and End Time before applying to all days',
                    variant: 'error'
                })
            );
            return;
        }
        
        // Apply to all other days
        this.days.forEach((day, dayIndex) => {
            // Skip the source day
            if (dayIndex === parseInt(sourceDayIndex, 10)) {
                return;
            }
            
            // Check if this day already has a meal with the same meal type
            let existingMealIndex = day.meals.findIndex(meal => meal.mealType === mealType);
            
            if (existingMealIndex !== -1) {
                // Update existing meal with the same type
                day.meals[existingMealIndex].startTime = startTime;
                day.meals[existingMealIndex].endTime = endTime;
            } else {
                // Create a new meal with the copied details
                day.meals.push({
                    mealName: `${day.name}-${mealType}`,
                    mealType: mealType,
                    startTime: startTime,
                    endTime: endTime
                });
            }
        });
        
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: `${mealType} schedule has been applied to all days`,
                variant: 'success'
            })
        );
    }

    handleMealChange(event) {
        const { index, day } = event.target.dataset;
        this.days[day].meals[index][event.target.name] = event.target.value;
        this.validateMeals(day);
    }

    validateMeals(dayIndex) {
        let isValid = true;
        this.days[dayIndex].meals.forEach(meal => {
            meal.error = false;
            meal.errorMessage = '';
            if (!meal.mealName || !meal.startTime || !meal.endTime) {
                meal.error = true;
                meal.errorMessage = 'Name of the meal, Start time and End  Time are required';
                isValid = false;  

            } else if (meal.startTime >= meal.endTime) {
                meal.error = true;
                meal.errorMessage = 'Start time should be less than End time';
                isValid = false;     
                
            } 
        });
        this.days[dayIndex].disableAddMeal = !isValid;

    }

    get disableSaveSchedule() {

        console.log('inside disableSaveSchedule');

        let hasErrors = false; 

        this.days.forEach(day => {
            day.meals.forEach(meal => {
                // Check for errors in each meal
                console.log('meal error:::', meal?.error);
                if (meal?.error) {
                        hasErrors = true;

                } 
            });
        });

        return hasErrors;

    }

    addMeal(event) {
        const dayIndex = event.target.dataset.day;
        // Add initial mealType value when creating a new meal
        const defaultMealType = this.menuOptions.length > 0 ? this.menuOptions[0].value : '';
        const dayName = this.days[dayIndex].name;
        
        // Auto-populate the meal name based on day and meal type
        const mealName = defaultMealType ? `${dayName}-${defaultMealType}` : '';
        
        this.days[dayIndex].meals.push({ 
            mealName: mealName, 
            startTime: '', 
            endTime: '', 
            mealType: defaultMealType 
        });
    }

    removeMeal(event) {
        const { index, day } = event.target.dataset;
        this.days[day].meals.splice(index, 1);
    }

    // Navigate to record page
    navigateToRecordPage() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                actionName: 'view'
            }
        });
    }

    saveSchedule() {
        let allMeals = [];
        this.days.forEach(day => {
            day.meals.forEach(meal => {
                if (meal.mealName && meal.startTime && meal.endTime) {  
                    allMeals.push({
                        day: day.name,
                        mealName: meal.mealName,
                        startTime: meal.startTime,
                        endTime: meal.endTime,
                        mealType: meal.mealType
                    });
                }
            });
        });
        
        if (allMeals.length === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: "Error",
                message: "Please add at least one meal.",
                variant: "error"
            }));
            return;
        }
       
        saveMessSchedule({ scheduleData: allMeals, messId: this.recordId })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({
                    title: "Success",
                    message: "Mess schedule saved successfully!",
                    variant: "success"
                }));
                
                // Try both methods to close/navigate
                try {
                    // First try to close the modal using CloseActionScreenEvent
                    this.dispatchEvent(new CloseActionScreenEvent());
                    
                    // Then navigate to record page (this will work even if the above doesn't)
                    setTimeout(() => {
                        this.navigateToRecordPage();
                    }, 1000);
                } catch (error) {
                    console.error('Error during navigation:', error);
                    // Fallback: just navigate to the record page
                    this.navigateToRecordPage();
                }
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: "Error",
                    message: error.body.message,
                    variant: "error"
                }));
            });
    }
}