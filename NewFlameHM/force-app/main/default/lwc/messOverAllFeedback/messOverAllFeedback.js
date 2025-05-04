import { LightningElement, track, wire } from 'lwc';
import getMessFeedBack from '@salesforce/apex/MessOverAllFeedBackController.getMessFeedBack';
import messResponse from '@salesforce/apex/MessOverAllFeedBackController.messResponse';
import feedBackImage from '@salesforce/resourceUrl/feedBackImage';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class MessOverAllFeedback extends LightningElement {
    feedbackImage = feedBackImage;
    @track isModalOpen = false;
    @track messOverAllFeedBack = [];
    @track messResponse = [];
    isLoading;
    @wire(getMessFeedBack)
    wiredVisitorQuestionnaires({ error, data }) {
        if (data) {
            
            this.messOverAllFeedBack = data.map((questionnaire) => ({
                questionnaireId:questionnaire.Id,
                questionLabel: questionnaire.Question_Label__c,
                questionType: questionnaire.Question_Type__c,
                required: questionnaire.Is_Required__c,
                response: ''
            }));
            //this.isLoading = false;
            console.log('this.messOverAllFeedBack:',JSON.stringify(this.messOverAllFeedBack));
        }else{
            console.log(error);
        }
    }

    // Open the modal
    openModal() {
        this.isModalOpen = true;
    }
    
    
    // Close the modal
    closeModal() {
        this.isModalOpen = false;
    }

     // Handle input changes
     handleInputChange(event) {
        const parameterId = event.target.dataset.id;
        const index = this.messOverAllFeedBack.findIndex(resp => resp.questionnaireId === parameterId);
        const value = event.target.value;
        if (index !== -1) {
            this.messOverAllFeedBack[index].response = value;
        } 
        console.log('this.messOverAllFeedBack:',JSON.stringify(this.messOverAllFeedBack));
    }

    // Save data
    handleSave() {
        this.isLoading = true;
        const isValid = this.validateData();
           
        
            if (!isValid) {
                
                return;
            }
        messResponse({ messFeedback: this.messOverAllFeedBack })
            .then(() => {
                this.isLoading = false;
                this.showToast('Success', 'Mess FeedBack saved successfully!', 'success');
                this.closeModal();
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error saving responses:', error);
                this.showToast('Error', 'Failed to save Mess FeedBack.', 'error');
            });
        
    }
    validateData(){
        let isValid = true;
        console.log('this.messOverAllFeedBack--'+JSON.stringify(this.messOverAllFeedBack));
        this.messOverAllFeedBack.forEach(item => {
            if(item.required && (!item.response && item.response.trim()=='')){
                this.isLoading = false;
                this.customShowToastEvent('Error', 'Please provide required feedback response', 'error');
                isValid=false;
            }
        });
        return isValid;
    }   
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}