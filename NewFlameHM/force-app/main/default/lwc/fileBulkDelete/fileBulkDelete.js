import { LightningElement, api, wire, track } from 'lwc';
import getFiles from '@salesforce/apex/FileBulkDeleteController.getFiles';
import deleteFiles from '@salesforce/apex/FileBulkDeleteController.deleteFiles';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import { NavigationMixin } from 'lightning/navigation';

export default class FileBulkDelete extends NavigationMixin(LightningElement) {
    @api recordId;
    @track fileData = [];
    @track selectedFiles = []; 
    @track columns = [
        { label: 'File Name', fieldName: 'title', type: 'text' },
        { label: 'Created Date', fieldName: 'createdDate', type: 'date' },
        {
            label: 'Actions',
            type: 'button',
            typeAttributes: {
                label: 'Preview',
                name: 'preview',
                iconName: 'action:preview',
                variant: 'brand'
            }
        }
    ];
    disableDeleteButton = true;
    isLoading =  true;

    // Called when the component is loaded
    connectedCallback() {
        console.log('Component loaded. Record ID:', this.recordId); 
        
    }

    @wire(getFiles, { recordId: '$recordId' }) 
    wiredFiles({ error, data }) {
        if (data) {
            this.wiredResult = data;
            this.fileData = data.map(file => ({
                id: file.ContentDocumentId,
                title: file.ContentDocument.Title,
                createdDate: file.ContentDocument.CreatedDate
            }));
            this.isLoading = false;
            this.error = undefined;
        } else if (error) {
            this.fileData = undefined;
            this.isLoading = false;
            
            this.showToast('Error', 'Error loading files', 'error'); // Ensure showToast is implemented
        }
    }



   

    // Handle selection of files in the datatable
    handleFileSelection(event) {
        this.selectedFiles = event.detail.selectedRows.map(row => row.id);
        this.disableDeleteButton = this.selectedFiles.length === 0;
    }
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        console.log(
            'Row action:',
            actionName,
            'on row:',
            row);
        if (actionName === 'preview') {
            this.previewFile(row.id); // Call the preview function with file ID
        }
    }

    previewFile(fileId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state: {
                selectedRecordId: fileId
            }
        });
    }


    // Handle deletion of selected files
    handleDelete() {
        this.isLoading = true;
        deleteFiles({ fileIds: this.selectedFiles })
            .then(() => {
                this.showToast('Success', 'Files deleted successfully', 'success');
                this.isLoading = false;
                this.dispatchEvent(new CloseActionScreenEvent());
            })
            .catch(error => {
                this.isLoading = false;
                this.showToast('Error', 'Error deleting files', 'error');
            });
            console.log('recordId',this.recordId);
    }

    // Show toast messages
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }
}