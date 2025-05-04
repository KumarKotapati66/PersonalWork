import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import saveEventTargetAudience from '@salesforce/apex/EventTargetAudienceController.saveEventTargetAudience';
import getProgramGraduationValues from '@salesforce/apex/EventTargetAudienceController.getProgramGraduationValues';

export default class EventTargetAudience extends NavigationMixin(LightningElement) {
    @api eventRecordId;
    @track isStudentsSelected = false;
    @track isAlumniSelected = false;
    @track isFacultySelected = false;
    @track selectedProgramName = '';
    @track selectedYearOfGraduation = '';
    @track selectedValues = [];
    isInviteAll=false;
    // programNameOptions = [
    //     { label: 'Bachelor of Technology', value: 'Bachelor of Technology', show: true, checked: false  },
    //     { label: 'Bachelor of Science', value: 'Bachelor of Science', show: true, checked: false  },
    //     { label: 'Bachelor of Business administration', value: 'Bachelor of Business administration', show: true, checked: false  },
    //     { label: 'Master of Technology', value: 'Master of Technology', show: true, checked: false  }
    // ];
    
    // yearOfGraduationOptions = [
    //   { label: '2024', value: '2024', show: true, checked: false  },
    //   { label: '2023', value: '2023', show: true, checked: false  },
    //   { label: '2022', value: '2022', show: true, checked: false  },
    //   { label: '2021', value: '2021', show: true, checked: false  }
    // ];

    // Fetch distinct values for Year of Graduation and Program
    @wire(getProgramGraduationValues)
    wiredPicklistValues({ data, error }) {
        if (data) {
            // Populate picklist options for Year_of_Graduation and Program
            this.yearOfGraduationOptions = data.Year_of_Graduation.map(value => ({
                label: value,
                value: value,
                show:true,
                checked:false
            }));
            this.programNameOptions = data.Program.map(value => ({
                label: value,
                value: value,
                show:true,
                checked:false
            }));
        } else if (error) {
            console.error('Error retrieving distinct text field values', error);
        }
    }

    handleProgramNameChange(event) {
      this.selectedProgramName = event.detail.value;
    }
    
    handleYearOfGraduationChange(event) {
      this.selectedYearOfGraduation = event.detail.value;
    }
    handleSelection(event) {
        console.log(JSON.parse(JSON.stringify(event.detail)))
        this.selectedValues = event.detail;
        console.log('Selected values:', this.selectedValues);
    }
    handleStudents(){
        this.isStudentsSelected  = true;
        this.selectedAudience = 'Students';
        //this.updatePicklist();
      }
      handleAlumni() {
        this.isAlumniSelected = true;
        this.selectedAudience = 'Alumni';
        //this.updatePicklist();
    }
    handleFaculty() {
      this.isFacultySelected = true;
      this.selectedAudience = 'Faculty';
     //this.updatePicklist();
    }
    handleClick(){
      this.isInviteAll = true;
    }
    updatePicklist() {
      this.template.querySelector('lightning-record-edit-form');
    }
    handlePrevious() {
        this.dispatchEvent(new CustomEvent("previous", { detail: "eventSetup" }));
      }

      async handleTargetAudienceSave() {
        this.showSpinner = false;
        console.log('handleTargetAudienceSave---'+this.eventRecordId);
        const targetAudience = {
           Id:null,
         
          Invite_All__c: this.isInviteAll,
          Event_Master__c: this.eventRecordId,
          
        };

         saveEventTargetAudience({ targetAudience})
          .then(() => {
              console.log('Record saved successfully');
              this.dispatchEvent(
                new CustomEvent("targetaudience", {
                  detail: { eventId: this.eventRecordId }
                })
              );
          })
          .catch(error => {
              console.error('Error saving record:', error);
              // Handle error appropriately
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