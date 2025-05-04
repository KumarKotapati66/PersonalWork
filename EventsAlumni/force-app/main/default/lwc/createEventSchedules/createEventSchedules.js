import { LightningElement, api, track, wire } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
//import { getFieldValue } from 'lightning/uiRecordApi';
import createEventSchedule from "@salesforce/apex/EventFormController.createEventSchedule";
import getEventSchedule from "@salesforce/apex/EventFormController.getEventSchedule";
import searchContacts from '@salesforce/apex/EventFormController.searchContacts';
//import EVENT from "@salesforce/schema/Event_Master__c.Name";
import STARTDATE from "@salesforce/schema/Event_Master__c.Start_Date__c";
import ENDDATE from "@salesforce/schema/Event_Master__c.End_Date__c";
import getEvent from '@salesforce/apex/EventFormController.getEvent';
import createContact from '@salesforce/apex/EventFormController.createContact';
import deleteSpeaker from '@salesforce/apex/EventFormController.deleteSpeaker';
import LightningPrompt from 'lightning/prompt';
const FIELDS = [
  STARTDATE,
  ENDDATE
];
export default class CreateEventSchedules extends NavigationMixin(LightningElement) {
  @api eventRecordId;
  @api isFeeSetup;
  //@api isScheduleSetup;
  @track startDate = "";
  @track endDate= "";
  @track eventScheduleRecords = [];
  @track filteredRecords  = [];
  @track speakerRecords = [];
  showSpinner = true;
  @track contactOptions = [];
  @track feeRecords ={
    sessionFee:'',
    noFee:false
  };
  @track isSessionPricing = false;
  @track isEventPricing = false
  @track openFeeSelection = false;
  @track selectedContactId = '';
  @track error;
  @track locationFields = {
    locationType: null,
    locationAddress: '',
    sessionLink: ''
  }
  @track apiname = 'Contact';
  @track objecticonname = 'standard:event';
  @track selectedDate = '';
  @track isFileInputVisible = true;
 
  get acceptedFormats() {
    return ['.pdf', '.png'];
  }
 
  set eventRecordId(value) {
    console.log('Setting eventRecordId:', value);
    this._eventRecordId = value;
    console.log('Event Record ID set to:', this._eventRecordId);
      
      this.loadDates();
     
  }

  get eventRecordId() {
      return this._eventRecordId;
  }
//   connectedCallback() {
//     console.log('Loading data with connectedCallback:', this.eventRecordId);
//     if(this.eventRecordId){
//       this.loadData(); 
//     }
//  }

async loadData() {
    if (this.eventRecordId) {
        console.log('Loading data with eventRecordId:', this.eventRecordId);
     await  getEventSchedule({ recordId: this.eventRecordId})
       .then(result => {
        console.log('Before filter',JSON.stringify(result));
            this.filteredRecords  = result
            .map((record, index) => ({
              index,
              ...record,
              startTime: this.formatTime(record.startTime),
              endTime: this.formatTime(record.endTime),
              eventId: this.eventRecordId,
              isOnSite: record.locationType== 'On-site'? true:false,
              isHybrid:record.locationType== 'Hybrid'? true:false,
              isOnlineEvent:record.locationType== 'Online event'? true:false,
              speakers:record.speakers?.map((speaker, speakerIndex) => ({
                speakerIndex, // Assign index to each speaker
                ...speaker, // Spread each speaker's details
            })) || [{ speakerIndex: 0, contactId: '',  description: '', speakerImage: '', speakerImageBase64: '' }]
              
            }));
            
           })
           .catch(error =>
           {
            console.log('Inside catch loaddata'+error);
               //this.showSuccessToast('Error', error, 'error');
               this.error = error;
           });
           console.log('this.filteredRecords :',this.filteredRecords.length, this.filteredRecords );
           if(this.filteredRecords.length > 0){
              this.eventScheduleRecords = this.filteredRecords.filter(record => {
                return record.startDate === this.selectedDate;
              });
           }
           console.log('Event Schedule Data:', JSON.stringify(this.eventScheduleRecords));
           
           if (this.eventScheduleRecords.length === 0) {
            //this.eventScheduleRecords = [];
             // this.renderedCallback();
            console.log('Inside get no schedules'+this.eventRecordId);
            this.handleAddRow();
            
          }
            this.handleOnLoad();
    } else {
      console.log('eventRecordId is undefined, skipping data load.');
  }
}
async loadDates() {
  if (this.eventRecordId){
    await getEvent({ recordId: this.eventRecordId })
    .then(result => {
        console.log('Event result:', JSON.stringify(result));
        this.startDate = result.startdate;
        this.endDate = result.enddate;

        // Log the dates after they are set
        console.log('Start Date:', this.startDate);
        console.log('End Date:', this.endDate);
        this.selectedDate = result.startdate;
        //this.connectedCallback();
        if ((this.startDate && this.endDate) && this.startDate != this.endDate) {
          this.generateDatePath(new Date(this.startDate), new Date(this.endDate));
      } else if (this.startDate) {
          this.datePath = [
              { date: new Date(this.startDate).toISOString().split('T')[0], variant: 'brand' }
          ];
      }
      this.loadData();
    })
    .catch(error => {
        console.error('Error in loadDates:', JSON.stringify(error));
    });
  }
    else {
      console.log('eventRecordId is undefined, skipping data load.');
  }
}

  /*@wire(getRecord, { recordId: "$eventRecordId", fields: [FIELDS] })
  wiredRecord({ error, data }) {
      if (data) {
          console.log('Record Data:', JSON.stringify(data));  

          this.startDate = getFieldValue(data, STARTDATE);
          this.endDate = getFieldValue(data, ENDDATE);
          
          console.log('wire Start Date:', this.startDate);
          console.log('wire End Date:', this.endDate);
      } else if (error) {
          console.error('Error fetching record data:', JSON.stringify(error));
      }
  }*/
//date path--------


   /* connectedCallback() {
      console.log('called connected call back')
      console.log('this.startDate && this.endDate',this.startDate, this.endDate)
        if ((this.startDate && this.endDate) && this.startDate != this.endDate) {
            this.generateDatePath(new Date(this.startDate), new Date(this.endDate));
        } else if (this.startDate) {
            this.datePath = [
                { date: new Date(this.startDate).toISOString().split('T')[0], variant: 'brand' }
            ];
        }
    }*/

    // Generate the date path with class data
    generateDatePath(start, end) {
        let currentDate = start;
        this.datePath = [];
        while (currentDate <= end) {
            this.datePath.push({
                date: currentDate.toISOString().split('T')[0],
                //className: currentDate.toISOString().split('T')[0] === this.selectedDate ? 'active' : ''
                variant: currentDate.toISOString().split('T')[0] === this.selectedDate ? 'brand' : 'neutral'
            });
            currentDate.setDate(currentDate.getDate() + 1); // Increment date
        }
    }

    // Handle when a date is clicked
    handleDateClick(event) {
        this.selectedDate = event.target.dataset.date;

        // Update the classes for each date dynamically
        this.datePath = this.datePath.map(item => ({
            ...item,
            variant: item.date === this.selectedDate ? 'brand' : ''
        }));

        // You can add further actions here
        console.log('Selected date:', this.selectedDate);
        this.loadData();
    }
//ended here date path--------

    @wire(searchContacts)
    wiredContacts({ error, data }) {
        if (data) {
            this.contactOptions = data.map(contact => ({
                label: contact.Name,
                value: contact.Id
            }));
        } else if (error) {
            this.error = 'An error occurred while fetching contacts';
            console.error('Error in searchContacts:', error);
        }
    }

    handleSearchChange(event) {
      const searchKey = event.target.value;
      findContacts({ searchKey })
          .then(result => {
              this.contactOptions = result.map(contact => ({
                  label: contact.Name,
                  value: contact.Id
              }));
          })
          .catch(() => {
              this.contactOptions = [];
          });
  }

  handleSelectionChange(event) {
      const selectedContactId = event.detail.value;
      console.log('Selected Contact ID:', selectedContactId);
      // Handle the selected contact further if needed
  }

  formatTime(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  handleOnLoad() {
    this.showSpinner = false;
  }
  
  handleAddRow() {
    this.eventScheduleRecords = [...this.eventScheduleRecords, {
      index: this.eventScheduleRecords.length,
      eventId: this.eventRecordId,
      id: '',
      agenda: '',
      startTime: null,
      endTime: null,
      endDate: null,
      startDate: this.selectedDate,
      name: '',
      sessionBroucher: '',
      locationType: '',
      locationAddress: '',
      isOnSite: false,
      isHybrid: false,
      isOnlineEvent: false,
      sessionLink: '',
      sessionBroucherBase64: '',
      speakers: [{ speakerIndex: 0, contactId: '',  description: '', speakerImage: '', speakerImageBase64: '' }]
    }];
  }
 
  handleAddSpeaker(event) {
    const index = event.currentTarget.dataset.id; // Get the index of the event schedule
    console.log('Inside add speaker')
    const newSpeaker = {speakerIndex: this.eventScheduleRecords[index].speakers.length, contactId: '', description: '', speakerImage: '', speakerImageBase64: '' };

    // Clone the existing eventScheduleRecords array
    const eventScheduleClone = [...this.eventScheduleRecords];
    eventScheduleClone[index].speakers = [...eventScheduleClone[index].speakers, newSpeaker]; // Add a new speaker to the speakers array

    this.eventScheduleRecords = [...eventScheduleClone]; // Update the tracked variable
    console.log('Inside add speaker eventScheduleRecords',this.eventScheduleRecords)
  }
  

  // Method to remove a speaker row
  handleRemoveSpeaker(event) {
    console.log('Inside Remove eventScheduleRecords',JSON.stringify(this.eventScheduleRecords))
    const eventIndex = event.currentTarget.dataset.id;
    const speakerIndex = event.currentTarget.dataset.speakerIndex;
    console.log('speakerIndex eventIndex', speakerIndex, eventIndex)
    // Clone the existing eventScheduleRecords array
    const eventScheduleClone = [...this.eventScheduleRecords];
    console.log('Inside Remove eventScheduleClone',JSON.stringify(eventScheduleClone))
    const speakerId =  eventScheduleClone[eventIndex].speakers[speakerIndex].Id;
    console.log('speakerId',speakerId);
    // Remove the specific speaker
    if (eventScheduleClone[eventIndex].speakers.length > 1) { // Ensure there's at least one speaker left
        eventScheduleClone[eventIndex].speakers.splice(speakerIndex, 1);
    }

    this.eventScheduleRecords = [...eventScheduleClone]; 
    if(speakerId){
      deleteSpeaker({recordId:speakerId})
      .then(
        result => {
          console.log('Delete result',result);
        })
      .catch(
        error => {
          console.log(error);
        });
      }
    }
  isLocationTypeChecked() {
    return false;
  }
 //Hanlde Location Type Boolean Check
 hanldeLocationTypeSelection(event){
  const field = event.target.name;
  const value = event.target.value;
  const rowIndex = event.target.dataset.id;
  console.log('Inside Location field and value, event index--'+field +' '+ value+' '+rowIndex);
 
 if (event.type === 'click') {
      console.log('Input value changed:', event.target.value);
       this.eventScheduleRecords[rowIndex].locationType = value;
       this.eventScheduleRecords[rowIndex].isOnSite = value == 'On-site'? true:false;
       this.eventScheduleRecords[rowIndex].isHybrid = value == 'Hybrid'? true:false;
       this.eventScheduleRecords[rowIndex].isOnlineEvent = value == 'Online event'? true:false;
        
    }
  
  console.log('Inside Location change--'+JSON.stringify(this.eventScheduleRecords));
 }
 hanldeLocationtextFields(event){
  const field = event.target.name;
  const value = event.target.value;

  console.log('Inside Location field and value--'+field +' '+ value);
  const rowIndex = event.target.dataset.id;
  console.log('Inside Location rowIndex--'+rowIndex);
 if (event.type === 'change') {
      console.log('Input value changed:', event.target.value);
       this.eventScheduleRecords[rowIndex][field] = value;
        
    }
  console.log('Inside Location change--'+JSON.stringify(this.eventScheduleRecords));
 }
  // Handle speaker field changes
  handleSpeakerInputChange(event) {
    const eventIndex = event.currentTarget.dataset.id;
    const speakerIndex = event.currentTarget.dataset.speakerIndex;
    console.log('speakerIndex:', speakerIndex);
    console.log('event.detail',JSON.stringify(event.detail));
    console.log('event.detail',JSON.stringify(event.target));
    const fieldName = event.target.name;
    const value = fieldName == 'contactId'?event.detail.recordId:event.target.value;
    console.log('fieldName:', fieldName, 'value:', value);
   
    const eventScheduleClone = JSON.parse(JSON.stringify(this.eventScheduleRecords));

    if (eventScheduleClone[eventIndex] && eventScheduleClone[eventIndex].speakers[speakerIndex]) {
        eventScheduleClone[eventIndex].speakers[speakerIndex][fieldName] = value;

        this.eventScheduleRecords = eventScheduleClone;

        console.log('Updated eventScheduleRecords:', JSON.stringify(this.eventScheduleRecords));
    } else {
        console.error('Invalid index or speaker structure');
    }
  }
  handleInputChange(event) {
    const rowIndex = event.target.dataset.id;
    const field = event.target.name;
    console.log('handleInputChange before--'+JSON.stringify(this.eventScheduleRecords));
    this.eventScheduleRecords[rowIndex][field] = event.target.value;
    this.eventScheduleRecords = [...this.eventScheduleRecords];
    console.log('handleInputChange before--'+JSON.stringify(this.eventScheduleRecords));
  }
  handleContactSelected(event) {
    const selectedContactId = event.detail;
    console.log('Selected Contact ID:', selectedContactId);
    // Handle the selected contact ID (e.g., display it or store it)
}


handleCreateNew(event) {
  //const newName = prompt('Enter Contact Name');
  const eventIndex = event.currentTarget.dataset.id;
  const speakerIndex = event.currentTarget.dataset.speakerIndex;
  console.log('speakerIndex:', speakerIndex);
  /*if (!newName) {
      alert('Both Name and Email are required to create a new contact.');
      return;
  }*/
       LightningPrompt.open({
        message: 'Enter Speaker Name', 
        label: 'Please Respond',
        defaultValue: '', 
    }).then((newName) => {
        if (newName === null) {
            return 'Enter Conatact Name';
        }


  createContact({ name: newName})
      .then((newContact) => {
          //this.selectedContact = newContact;
          console.log('newContact',newContact.Id)
          const eventScheduleClone = JSON.parse(JSON.stringify(this.eventScheduleRecords));
      
          if (eventScheduleClone[eventIndex] && eventScheduleClone[eventIndex].speakers[speakerIndex]) {
              eventScheduleClone[eventIndex].speakers[speakerIndex].contactId = newContact.Id;
      
              this.eventScheduleRecords = eventScheduleClone;
      
              console.log('Updated eventScheduleRecords:', JSON.stringify(this.eventScheduleRecords));
          } else {
              console.error('Invalid index or speaker structure');
          }
      })
      .catch((error) => {
          console.error('Error creating contact:', error);
          //alert('An error occurred while creating the contact. Please try again.');
      });
    });  
}

//Image file upload logic
handleFileChange(event) {
  const index = event.target.dataset.id;
  const isSessionUpload = event.target.dataset.type === 'session';
  console.log('event', event);
  console.log('event', event.target.files[0].name);
  const file = event.target.files[0];
      if (file) {
        const speakerIndex = isSessionUpload ? null : event.target.dataset.speakerIndex;
        console.log('file---'+file);
        this.createImagePreview(file, index, isSessionUpload, speakerIndex);
        this.convertToBase64(file)
            .then(base64Image => {
                if (isSessionUpload) {
                    this.eventScheduleRecords[index].sessionBroucherBase64 = base64Image; // Store Base64 for session
                } else {
                    const speakerIndex = event.target.dataset.speakerIndex;
                    this.eventScheduleRecords[index].speakers[speakerIndex].speakerImageBase64 = base64Image; // Store Base64 for speaker
                }
          })
          .catch(error => {
              console.error('Error converting image to Base64:', error);
          });
    }
      this.isFileInputVisible = false; 
}

openFileDialog() {
  // Open the hidden file input
  this.template.querySelector('input[type="file"]').click();
}
createImagePreview(file, index, isSessionUpload, speakerIndex) {
  const reader = new FileReader();
  reader.onloadend = () => {
    if (isSessionUpload) {
      this.eventScheduleRecords[index].sessionBroucher = reader.result; 
  } else {
      //const speakerIndex = event.target.dataset.speakerIndex;
      this.eventScheduleRecords[index].speakers[speakerIndex].speakerImage = reader.result;
  }
  };
  reader.readAsDataURL(file);
}

removeImage(event) {
  const index = event.target.dataset.id;
  const isSession = event.target.dataset.type === 'session';
        if (isSession) {
            this.eventScheduleRecords[index].sessionBroucher = ''; // Clear session image
        } else {
            const speakerIndex = event.target.dataset.speakerIndex;
            this.eventScheduleRecords[index].speakers[speakerIndex].speakerImage = ''; // Clear speaker image
        }
  this.isFileInputVisible = true;
}

convertToBase64(file) {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]); // Remove the data URL prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
  });
}
async validateFields(){
  console.log('ValidateFields')
  this.eventScheduleRecords.forEach(record => {
      if(!record.name){
        //this.error = 'Please enter Name for the session '+record.startDate;
        throw new Error('Please enter Session title for the session '+record.startDate);
       // return;
      }
      if(!record.startTime || !record.endTime)
      {
        //this.error = 'Please enter start and end time for the session '+record.name;
        throw new Error('Please enter start and end time for the session '+record.name);
        //return;
      }

  });
}
  async handleSave() {
    this.showSpinner = true;
    try {
      await this.validateFields();
      console.log('handlesavebb--'+JSON.stringify(this.eventScheduleRecords));
      await createEventSchedule({ records: JSON.stringify(this.eventScheduleRecords) })
       this.resetForm();
       console.log('handlesavebb--'+JSON.stringify(this.eventScheduleRecords));
      await this.loadData();
       console.log('handlesave--'+JSON.stringify(this.eventScheduleRecords));
        this.openFeeSelection = true;
        
      //await insertSpeaker({ records: JSON.stringify(this.eventScheduleRecords.speakers) });
      //this.showSuccessToast('Success', 'Scheduled successfully', 'success');
      //refreshApex(this.getSchedule);
      
      //this.dispatchEvent(new CustomEvent('eventschedule', { detail: { eventId: this.eventRecordId } }));
      
    } catch (error) {
      console.log(
        'Error while saving record: ' +
        JSON.stringify(error) );
        console.error('Error while saving record:', error);
        this.showSuccessToast('Error', error.message || 'Error while saving record', 'error');
     
    } finally {
      this.showSpinner = false;
    }
  }

  handlePrevious() {
    this.dispatchEvent(new CustomEvent("previous", { detail: "targetAudience" }));
  }

  handleCancel() {
    if (this.eventRecordId) {
      this[NavigationMixin.Navigate]({
        type: "standard__recordPage",
        attributes: {
          recordId: this.eventRecordId,
          actionName: "view"
        }
      });
    } else {
      this[NavigationMixin.Navigate]({
        type: "standard__objectPage",
        attributes: {
          objectApiName: "Event_Master__c",
          actionName: "list"
        },
        state: {
          filterName: "Recent"
        }
      });
    }
  }
  
// Related Fee Popup 
  handleSessionFee() {
    //const selectedValue = event.target.value; 
    this.resetForm();
    this.isSessionPricing = true;
    const eventType = 'Session';
    this.closeModal();
    this.dispatchEvent(new CustomEvent('eventschedule', { 
      detail: { 
        eventId: this.eventRecordId, 
        value: this.isSessionPricing, 
        type: eventType 
      } 
    }));
}

resetForm(){
  this.datePath = [];
   this.eventScheduleRecords = [];
  this.filteredRecords = []; 
}
handleEventFee() {
  //const selectedValue = event.target.value;
 this.resetForm();
  this.isEventPricing = true;
  const eventType = 'Event';
  this.closeModal();
    this.dispatchEvent(new CustomEvent('eventschedule', { 
      detail: { 
        eventId: this.eventRecordId, 
        value:this.isEventPricing, 
        type:eventType
        } 
    }));
}
openFeeSelectionModal() {
  this.openFeeSelection = true;
}

closeModal() {
  this.openFeeSelection = false;
}
  showSuccessToast(title, message, variant) {
    const toastEvent = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    });
    this.dispatchEvent(toastEvent);
  }
}