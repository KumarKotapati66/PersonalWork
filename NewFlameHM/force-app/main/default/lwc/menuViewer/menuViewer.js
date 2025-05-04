import { LightningElement, track, wire } from 'lwc';
import getMessRecords from '@salesforce/apex/MenuController.getMessRecords';
import getMessRecord from '@salesforce/apex/MenuController.getMessRecord';

export default class MenuViewer extends LightningElement {
    isDailyMenu = false;
    isWeeklyMenu = false;
    isLoading = false; 
    uniqueKey = Date.now();
    dateValue = new Date().toISOString().split('T')[0];
    selectedDate = new Date(this.dateValue);
    menuPeriod = this.formatWeekRange(this.selectedDate); 
    @track selectedWeek; //to pass child component for proper dates
    @track daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    @track dayOfSelectedDate = this.daysOfWeek[this.selectedDate.getDay()];
    @track messOptions=[];
    selectedMessRecord ='';
    //isEnableMessOptions = false;
    connectedCallback(){
        //this.dateValue = new Date();
        console.log('selectedDate--'+this.dateValue);
        console.log('dayOfSelectedDate--'+this.dayOfSelectedDate);
        console.log('menuPeriod--'+this.menuPeriod);
    }
    get menuType() {
        return this.isDailyMenu ? 'Daily Menu' : this.isWeeklyMenu?'Weekly Menu':'Select Mess and Date to view menu';
    }
    get class(){
        if(this.selectedMessRecord && this.dateValue){
            return null;
        }
    }
    // @wire(getMessRecord)
    // wiredMessRecord({error,data}){
    //   if(data){
    //        this.selectedMessRecord = data.recordId;
    //        if(this.selectedMessRecord){
    //         this.isDailyMenu = true;
    //        }
    //        /*if(!data.isAdmin){
    //            this.isEnableMessOptions = true;
    //        }*/
    //   }else{
    //       console.log(error);
    //   }
    // }
     @wire(getMessRecords)
     wiredMessRecords({error,data}){
       if(data){
           this.messOptions = data.map(record =>({
            value: record.Id,
            label: record.Name
           }));
           if (this.messOptions.length > 0) {
             this.selectedMessRecord = this.messOptions[0].value;
           }
           console.log('this.messOptions:::', JSON.stringify(this.messOptions));
       }else{
           console.log(error);
       }
     }
    
     handleChangeSelectedMess(event) {
        // Get the string of the "value" attribute on the selected option
        this.selectedMessRecord = event.detail.value;
        console.log('this.selectedMessRecord--',this.selectedMessRecord);
        this.isDailyMenu = false;
        this.isWeeklyMenu = false;
    }
    formatWeekRange(date) {
        const start = new Date(date);
        //const end = new Date(date);
        //start.setDate(start.getDate() - start.getDay()); // Start of the week (Sunday)
        const end = new Date(start);
        end.setDate(end.getDate() + 6); // End of the week (Sat)
        console.log('start,end'+start+','+end);
        this.selectedWeek = `${start.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })} - ${end.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })}`;

        return `${start.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
        })} - ${end.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
        })}`;
    }
    //Move to the previous week
    previousWeek() {
        console.log('Previous week clicked!');
        this.selectedDate.setDate(this.selectedDate.getDate() - 7); // Subtract 7 days
        this.menuPeriod = this.formatWeekRange(this.selectedDate); // Update the displayed week range
        console.log('this.menuPeriod--'+this.menuPeriod);
        
        
    }

    // Move to the next week
    nextWeek() {
        console.log('Next week clicked!');
        this.selectedDate.setDate(this.selectedDate.getDate() + 7); // Add 7 days
        console.log('this.selectedDate--'+this.selectedDate);
        this.menuPeriod = this.formatWeekRange(this.selectedDate); // Update the displayed week range
        
    }
    showDailyMenu() {
        this.isWeeklyMenu=false;
        this.isDailyMenu = true;
        this.dayOfSelectedDate = this.daysOfWeek[this.selectedDate.getDay()];
        this.dateValue = new Date(this.selectedDate).toISOString().split('T')[0];
        console.log('this.dayOfSelectedDate ---'+this.dayOfSelectedDate);
        console.log('this.dateValue ---'+this.dateValue);
        console.log('this.selectedDate ---'+this.selectedDate);
    }

    showWeeklyMenu() {
        this.isDailyMenu=false;
        this.isWeeklyMenu = true;
        console.log('this.selectedDate--'+this.selectedDate);
        this.menuPeriod = this.formatWeekRange(this.selectedDate);
        console.log('this.menuPeriod--'+this.menuPeriod);
    }

    handleDateChange(event) {
        this.isDailyMenu=false;
        this.isWeeklyMenu = false;
        this.dateValue = event.target.value;
        this.selectedDate = new Date(this.dateValue);
        this.dayOfSelectedDate = this.daysOfWeek[this.selectedDate.getDay()];
        if (!this.isDailyMenu) {
            this.menuPeriod = this.formatWeekRange(this.selectedDate);
        }
    }
}