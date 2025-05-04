import { LightningElement, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import messFeedback from '@salesforce/apex/MenuController.messFeedback';
import getMessRecords from '@salesforce/apex/MenuController.getMessRecords';
import getQuestionnaires from '@salesforce/apex/MenuController.getQuestionnaires';
import userId from '@salesforce/user/Id';
import CONTACT_MESS_FIELD from '@salesforce/schema/User.Contact.Mess__c';
export default class MessFeedBackForm extends LightningElement {
    @track selectedFeedback = null;
    @track currentUserId = userId;
    @track currentContactId=null;
    @track messOptions=[];
    selectedMessRecord;
    isLoading=false;
   @track emojis = [
        { icon: '😠', value: 1, label: 'Very Dissatisfied', variant: 'slds-button slds-button_icon slds-button_icon-border-filled' },
        { icon: '😑', value: 2, label: 'Dissatisfied', variant: 'slds-button slds-button_icon slds-button_icon-border-filled' },
        { icon: '😐', value: 3, label: 'Neutral', variant: 'slds-button slds-button_icon slds-button_icon-border-filled' },
        { icon: '😊', value: 4, label: 'Satisfied', variant: 'slds-button slds-button_icon slds-button_icon-border-filled' },
        { icon: '😍', value: 5, label: 'Very Satisfied', variant: 'slds-button slds-button_icon slds-button_icon-border-filled' }
    ];
    @track questionnaires =[];
    @track questionnaireResponses = [];
    selectedMessRecord;
    connectedCallback(){
        console.log('this.currentUserId--'+this.currentUserId);
        console.log('this.currentContactId--'+this.currentContactId);
        }
        @wire(getMessRecords)
        wiredMessRecords({error,data}){
          if(data){
              this.messOptions = data.map(record =>({
               value: record.Id,
               label: record.Name
              }));
   
              console.log('this.messOptions:::', JSON.stringify(this.messOptions));
          }else{
              console.log(error);
          }
        }
       
        handleChangeSelectedMess(event) {
           // Get the string of the "value" attribute on the selected option
           this.isLoading = true;
           this.questionnaires = undefined;
           this.questionnaireResponses = [];
           this.selectedMessRecord = event.detail.value;
           console.log('this.selectedMessRecord--',this.selectedMessRecord);
           if(this.selectedMessRecord){
              this.loadQuestionnaires();
           }
       }
//  @wire(getRecord, { recordId: '$currentUserId', fields: [CONTACT_MESS_FIELD] })
//     wiredUser({ error, data }) {
//         if (data) {
//             console.log('data--'+JSON.stringify(data));
//             ///this.currentContactId = data.fields.ContactId.value;
//             this.selectedMessRecord = data.fields.Contact.value.fields.Mess__c.value;
//             console.log('this.selectedMessRecordwire--'+this.currentContactId);
//             //this.error = undefined;
//             if(this.selectedMessRecord){
//                 this.loadQuestionnaires();
//             }
//             //this.error = undefined;
//         } else if (error) {
//             //this.error = error;
//             this.currentContactId = undefined;
//         }
//     }
        // @wire(getMessRecord)
        // wiredMessRecord({error,data}){
        //   if(data){
        //        this.selectedMessRecord = data.recordId;
        //        if(this.selectedMessRecord){
        //            this.loadQuestionnaires();
        //        }
        //   }else{
        //       console.log(error);
        //   }
        // }
        loadQuestionnaires() {
            getQuestionnaires({ recordId: this.selectedMessRecord })
                .then(data => {
                    this.questionnaires = data.map(questionnaire => ({
                        Id: questionnaire.Id,
                        label: questionnaire.Question_Label__c,
                        emojis:this.emojis
                    }));
                    console.log('questionnaires--'+JSON.stringify(this.questionnaires));
                    this.questionnaireResponses = data.map(questionnaire => ({
                        questionnaireId: questionnaire.Id,
                        response: null 
                    }));
                    this.isLoading = false;
                })
                .catch(error => {
                    this.isLoading = false;
                    this.questionnaires = undefined
                    console.error(error);
                });
        }
 
    handleSelection(event) {
        console.log('this.selectedFeedback--'+JSON.stringify(event.target));
        const questionnaireId = event.target.dataset.questionnaireid;
        const selectedFeedback = event.target.dataset.value;
        console.log('this.selectedFeedback--'+selectedFeedback);
        console.log('this.questionnaireId--'+questionnaireId);
        const index = this.questionnaireResponses.findIndex(item => item.questionnaireId === questionnaireId);
        if (index !== -1 && selectedFeedback) {
            this.questionnaireResponses[index].response =  selectedFeedback;
        } else if(selectedFeedback) {
            this.questionnaireResponses.push({ questionnaireId, selectedFeedback});
        }
        console.log('questionnaireResponses--'+JSON.stringify(this.questionnaireResponses));
    
        // this.emojis = this.emojis.map(emoji => ({
        //     ...emoji,
        //     variant: emoji.value == this.selectedFeedback ? 'slds-button slds-button_icon slds-button_icon-brand' : 'slds-button slds-button_icon slds-button_icon-border-filled'
        // }));
        this.questionnaires = this.questionnaires.map(questionnaire => ({
           ...questionnaire,
            emojis: this.emojis.map(emoji => ({
                ...emoji,
                variant: emoji.value == selectedFeedback ? 'slds-button slds-button_icon slds-button_icon-brand' : 'slds-button slds-button_icon slds-button_icon-border-filled'
            }))
        }));
    }

    async handleSubmit() {
        let hasError = false;
        this.questionnaireResponses.forEach(response => {
            if (!response.response) {
                this.ToastMessage('Error', 'Please select a feedback option before submitting.', 'error');
                hasError=true;
                return;
            }
        });
        if (hasError) {
            return;
        }
        const feedbackPayload = this.questionnaireResponses;
       //await messFeedback({ feedbackData: feedbackPayload })
       try {
        await messFeedback({ feedbackData: feedbackPayload });
           this.ToastMessage('Success', 'Thank you for your feedback!', 'success');
           this.selectedFeedback = null; 
        } catch (error) {
            this.ToastMessage('Error', 'Exception Occured', 'error');
        }
    }
    ToastMessage(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }
}