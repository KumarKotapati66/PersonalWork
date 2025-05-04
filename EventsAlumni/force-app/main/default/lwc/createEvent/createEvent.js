import { LightningElement, track, wire, api } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getOptions from '@salesforce/apex/EventFormController.getPicklistValues';
import updateEvent from '@salesforce/apex/EventFormController.updateEvent';
import getEvent from '@salesforce/apex/EventFormController.getEvent';

export default class CreateEvent extends NavigationMixin(LightningElement) {
  @api eventRecordId;
  @api isEventSetup;  
  @track wiredProgram;
  @track suitableForOptions = [];
  @track isEventGroup = false;
  @track selectedValues = [];
  @track eventDetails;
  @track imageUrl;
  @track imageFile;
  @track isFileInputVisible = true;
  @track existingEventType;
  @track eventfields = {
    Id: '',  
    contentDocumentId: null,
    isEventGroup: false,
    eventTitle: '',
    eventGroupId: null,
    eventGroupTitle: '',
    maximumNumberOfParticipants: null,
    eventTypes: '',
    description: '',
    agenda: '',
    startdate: null,
    enddate: null,
    image: null,
    imageFileName: null
  };
  showSpinner = true;
  suitableFor;
  acceptedFormats = [".jpg", ".jpeg", ".png"];
@track parentOptions = [];

   get showSpinner(){
    return this.showSpinner;
   }
    handleInputChange(event) {
      
      const field = event.target.dataset.id;
      const value = event.target.value;
      console.log('handle INput changefield---'+field);
      console.log('handle INput change value---'+value)
      this.eventfields[field] = value;
      console.log('handleInputChange eventfields---'+JSON.stringify(this.eventfields));
  }
    handleSelection(event) {
      console.log(JSON.parse(JSON.stringify(event.detail)))
      this.selectedValues = event.detail;
      this.eventfields.eventTypes = this.selectedValues;
      console.log('Selected values:', this.selectedValues);
  }
  //GET EVENT DATA
 /* @wire(getEvent, { recordId: "$eventRecordId" })
  eventResult(result) {
    const { data, error } = result;
    if (error) {
      console.error('Error fetching event schedule:', error);
      this.showToast('Error', 'Error fetching event', 'error');
      return;
    }

    if (data) {
      console.log(JSON.stringify(data));
      this.eventDetails = data
      this.eventfields.Id = data.Id;
      console.log('IDcheck'+JSON.stringify(this.eventfields))
      console.log('data.eventTypes'+data.eventTypes)
      this.selectedValues = data.eventTypes !=null ? data.eventTypes : [];
      this.imageUrl = data.image;
      this.isFileInputVisible = this.imageUrl !=null? false:true;
      console.log(
        'selectedValues=='+this.selectedValues+'image--'+this.imageUrl);
      this.dispatchEvent(new CustomEvent('select', { detail: { value: this.selectedValues } }));
      console.log(JSON.stringify(this.eventDetails))
    }
    this.showSpinner = false;
  }*/
    connectedCallback() {
      this.fetchEventData();
  }
    fetchEventData() {
      this.showSpinner = true; // Show spinner while loading data
      getEvent({ recordId: this.eventRecordId })
          .then(data => {
              console.log(JSON.stringify(data));
              this.eventDetails = data;
              this.eventfields.Id = data.Id;
              console.log('IDcheck' + JSON.stringify(this.eventfields));
              this.selectedValues = data.eventTypes != null ? data.eventTypes : [];
              this.imageUrl = data.image;
              this.isFileInputVisible = this.imageUrl != null ? false : true;
              console.log('selectedValues==' + this.selectedValues + ' image--' + this.imageUrl);
              this.dispatchEvent(new CustomEvent('select', { detail: { value: this.selectedValues } }));
              console.log(JSON.stringify(this.eventDetails));
          })
          .catch(error => {
              console.error('Error fetching event schedule:', error);
              this.showToast('Error', 'Error fetching event', 'error');
          })
          .finally(() => {
              this.showSpinner = false; // Hide spinner after loading
          });
  }

  @wire(getOptions)
  wiredOptions({ error, data }) {
      if (data) {
        setTimeout(() => {
          this.parentOptions = data.map(option => ({
            label: option,
            value: option,
            show: true,
            checked: this.selectedValues.includes(option)
          }));
          console.log('this.selectedValues',JSON.stringify(this.selectedValues));
          
          console.log('this.options',JSON.stringify(this.parentOptions));
          this.callChildComponentMethod();
        }, 2000);
        
       
      } else if (error) {
          console.error('Error fetching picklist values:', error);
      }
  }  

    
  callChildComponentMethod() {
    setTimeout(() => {
        const childComponent = this.template.querySelector('c-event-multi-select-combobox');
        if (childComponent) {
            childComponent.postSelect(); 
        } else {
            console.error('Child component not found!');
        }
    }, 0);
}      

 
handleCheckboxChange(event) {
  this.isEventGroup = event.target.checked;
}    
  
handleOnLoad() {
  this.showSpinner = false;
}
handlePrevious() {
  this.dispatchEvent(new CustomEvent("previous", { detail: "eventSetup" }));
}

 
  async handleSaveAsDraft() {
    /*if(this.imageFile != null){
    this.fields.image = await this.convertToBase64(this.imageFile);
    }*/
   console.log('eventFields---'+JSON.stringify(this.eventfields));
    await updateEvent({ eventData: JSON.stringify(this.eventfields) })
        .then(result => {
            //this.showToast('Success', 'Record saved successfully', 'success');
            console.log('Data saved successfully:', result);
            // Navigate to the record page using the ID returned from Apex
            //window.location.reload();
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: this.eventRecordId,
                    objectApiName: 'Event_Master__c',
                    actionName: 'view'
                }
            });
        })
        .catch(error => {
            //this.showToast('Error', 'Error saving record', 'error');
            console.error('Error saving data:', error);
        });
}

  async handleSave() {
    
    console.log('iseventSetup=='+this.isEventSetup);

    console.log('eventfields.image=--'+this.eventfields.image);
    console.log('this.eventRecordId=='+this.eventRecordId);
    try{
      this.showSpinner = true;
      await updateEvent({ eventData: JSON.stringify(this.eventfields) })
            .then(result => {
                //this.showToast('Success', 'Record saved successfully', 'success');
                  //refreshApex(this.eventDetails);
                  //refreshApex(eventResult);
                  refreshApex(this.parentOptions);
                  console.log('this.eventDetails:', this.eventDetails);
                console.log('Data saved successfully:', result);
                //this.navigateToRecord(result);
            })
            .catch(error => {
                //this.showToast('Error', 'Error saving record', 'error');
                console.error('Error saving data:', error);
            });
    this.dispatchEvent(
      new CustomEvent("event", {
        detail: { eventId: this.eventRecordId }
      })
    );
    }catch (error) {
      // Handle errors properly
      console.error('Error saving data:', error);
      // Optionally, show a toast
     this.showToast('Error', 'Error saving record', 'error');
  }
  }

  /*handleCoverImageUpload({ detail }) {
    console.log('detail=='+JSON.stringify(detail));
    console.log('detail.documentId=='+detail.files[0].documentId);
    console.log('detail.contentVersionId=='+detail.files[0].contentVersionId);
    this.coverImage = detail;
    this.coverImageName = detail.files[0].name;
    this.coverImageDocumentId = detail.files[0].documentId;
    this.coverImageContentId = detail.files[0].contentVersionId;
  }*/

  

//Image file upload logic
handleFileChange(event) {
  console.log('event', event);
  console.log('event', event.target.files[0].name);
  const file = event.target.files[0];
      if (file) {
        console.log('file---'+file);
          this.createImagePreview(file);
          this.imageFile = file;
          this.convertToBase64(file)
          .then(base64Image => {
              console.log('Base64 Image:', base64Image);
              this.eventfields.image = base64Image; // Store the Base64 image in the eventfields object
          })
          .catch(error => {
              console.error('Error converting image to Base64:', error);
          });
    }
      this.isFileInputVisible = false; // Hide file input when image is selected
}

openFileDialog() {
  // Open the hidden file input
  this.template.querySelector('input[type="file"]').click();
}
createImagePreview(file) {
  const reader = new FileReader();
  reader.onloadend = () => {
      this.imageUrl = reader.result;
  };
  reader.readAsDataURL(file);
}

removeImage() {
  this.imageUrl = null;
  this.imageFile = null;
  this.eventfields.image = null;
  this.isFileInputVisible = true; // Show file input again
}

convertToBase64(file) {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]); // Remove the data URL prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
  });
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

  showToast(title, successMessage, variant) {
    const toastEvent = new ShowToastEvent({
      title: title,
      message: successMessage,
      variant: variant
    });
    this.dispatchEvent(toastEvent);
  }
}