import { LightningElement, wire, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getOptions from '@salesforce/apex/EventFormController.getPicklistValues';
import saveData from '@salesforce/apex/EventFormController.saveData';

export default class EventHandler extends NavigationMixin(LightningElement) {
    @track isEventGroup = false;
    @track isLoading = false;
    @track selectedValues = [];
    @track eventGroupId;
    @track imageUrl;
    @track imageFile;
    @track isFileInputVisible = true;
    @track fields = {
        contentDocumentId: '',
        isEventGroup: false,
        eventTitle: '',
        eventGroupId: '',
        eventGroupTitle: '',
        eventTypes: '',
        description: '',
        agenda: '',
        startdate: '',
        enddate: '',
        image: '',
        imageFileName: ''
    };
    @track parentOptions = [];
    @track apiname = 'Event_Master__c';
    @track objecticonname = 'standard:event';
    @track recordtype = 'Event_Group';
    
    @wire(getOptions)
    wiredOptions({ error, data }) {
        if (data) {
            this.parentOptions = data.map(option => ({
                label: option,
                value: option,
                show: true,
                checked: false
            }));
            console.log('this.options', this.parentOptions);
        } else if (error) {
            console.error('Error fetching picklist values:', error);
        }
    }

    handleCheckboxChange(event) {
        this.isLoading = true;
        this.isEventGroup = event.target.checked;
        this.fields.isEventGroup = this.isEventGroup;
        this.isLoading = false;
    }

    handleLookupUpdate(event) {
        const selectedRecord = event.detail.selectedRecord;
        if (selectedRecord && selectedRecord.Id) {
            console.log('Selected Record ID: ' + selectedRecord.Id);
            this.selectedRecordId = selectedRecord.Id;
            this.eventGroupId = selectedRecord.Id;
            this.fields.eventGroupId = this.eventGroupId;
        }
    }

    handleSelection(event) {
        this.selectedValues = event.detail;
        this.fields.eventTypes = this.selectedValues;
        console.log('Selected values:', this.selectedValues);
    }

    handleInputChange(event) {
        const field = event.target.dataset.id;
        this.fields[field] = event.target.value;
    }

    handleCancel() {
        const evt = new ShowToastEvent({
            title: 'Canceled',
            message: 'Canceled creating Event',
            variant: 'error',
        });
        this.dispatchEvent(evt);
        history.back();
        this.dispatchEvent(new CustomEvent('close'));
    }

    async handleSaveAndProceed() {
        if (this.imageFile != null) {
            this.fields.image = await this.convertToBase64(this.imageFile);
        }
        saveData({ eventData: JSON.stringify(this.fields) })
            .then(result => {
                //this.showToast('Success', 'Record saved successfully', 'success');
                console.log('Data saved successfully:', result);
                this.navigateToRecord(result);
            })
            .catch(error => {
                //this.showToast('Error', 'Error saving record', 'error');
                console.error('Error saving data:', error);
            });
    }

    async handleSaveAsDraft() {
        if (this.imageFile != null) {
            this.fields.image = await this.convertToBase64(this.imageFile);
        }
        saveData({ eventData: JSON.stringify(this.fields) })
            .then(result => {
                //this.showToast('Success', 'Record saved successfully', 'success');
                console.log('Data saved successfully:', result);
                // Navigate to the record page using the ID returned from Apex
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: result,
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

    navigateToRecord(recordId) {
        if (this.isEventGroup) {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: recordId,
                    objectApiName: 'Event_Master__c',
                    actionName: 'view'
                }
            });
        } else {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: recordId,
                    objectApiName: 'Event_Master__c',
                    actionName: 'edit'
                }
            });
        }

    }

    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        this.fields.contentDocumentId = uploadedFiles[0].documentId;
        console.log('Files uploaded: ', uploadedFiles);
        console.log('Files uploaded: ', this.fields.contentDocumentId);
    }

    handleFileChange(event) {
        console.log('event', event);
        console.log('event', event.target.files[0].name);
        const file = event.target.files[0];
        if (file) {
            this.createImagePreview(file);
            this.imageFile = file;
            this.fields.imageFileName = event.target.files[0].name;
            this.isFileInputVisible = false; // Hide file input when image is selected
        }
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
}