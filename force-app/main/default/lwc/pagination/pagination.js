import { LightningElement, track } from 'lwc';
import getContactList from '@salesforce/apex/ContactController.getContactList';
import totalRecordsCount from '@salesforce/apex/ContactController.totalRecordsCount';
import {ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord } from 'lightning/uiRecordApi';

export default class Pagination extends LightningElement {
    @track data;
    pageSize = 5;
    allPages = 0;
    totalRecords = 0;
    pageNumber = 1;
    languages;
    showModal = false;
    rowId;
    timeout;
    @track columns=[{
                    label:'FirstName',
                    fieldName:'FirstName',
                    hideDefaultActions: true,
                   },
                   {
                    label:'LastName',
                    fieldName:'LastName',
                   },
                   {
                    label:'Languages',
                    fieldName:'Languages__c',
                   },
                   {
                    label:'Email',
                    fieldName:'Email',
                    editable:true,
                   },
                   {
                    label:'Actions',
                    type:'action',
                    typeAttributes:{ rowActions:this.getRowActions}
                   },
                 ];
    connectedCallback(){
        this.loadData();
    }
    renderedCallback(){
        console.log('renderedCallback');
    }  
  getRowActions(row, doneCallback){
          const actions = [];
          console.log(row);
          const Languages = row.Languages__c;
          console.log(Languages);
          if(row.Languages__c){
              actions.push({
                  label:'Update',
                  name:'update'
              });
          }else{
            actions.push({
                label:'Add Language',
                name:'addLanguage'
            });
          }
          setTimeout(()=>{
             doneCallback(actions);
          },200);
    }        
    async loadData(){
        
        this.totalRecords = await totalRecordsCount();
        this.allPages = Math.ceil(this.totalRecords/this.pageSize);
        this.loadContacts();
    }   
    async loadContacts(){
        this.data= await getContactList({pageNumber:this.pageNumber, pageSize:this.pageSize});
    }
    handlePreviousClick(){
        --this.pageNumber;
        this.loadContacts();
    }
    handleNextClick(){
        ++this.pageNumber;
        this.loadContacts();
    }
    handleFirstClick(){
        if(this.pageNumber > 1){
            this.pageNumber = 1;
            this.loadContacts();
        }
        
    }
    handleLastClick(){
        if(this.pageNumber < this.allPages){
            this.pageNumber = this.allPages;
            this.loadContacts();
        }
        
    }
    get previousButton(){
        return this.pageNumber == 1;
    }
    get nextButton(){
        return this.pageNumber == this.allPages;
    }

    handleRowAction(event){
        console.log('handleRowAction');
        console.log('event--',event.detail, event.target);
        console.log('event',JSON.stringify(event.detail));
        console.log('event--',event.target);

        const {action,row} = event.detail;
        console.log('row--',row, action);
        console.log('row.Languages__c--',row.Languages__c);
        this.languages = row.Languages__c;
        this.rowId=row;
        this.showModal = true;
    }
    handleLanguageChange(event){
        console.log('event',event.target.value);
        const language= event.target.value;
        clearTimeout(this.timeout);
        this.timeout=setTimeout(()=>{
            this.languages = language;
            console.log('inside--',this.languages);
        },2000);
    }
    closeModal(){
        this.showModal=false;
    }
    handleLanguageSave(){
        const recordInputs = [{
            fields:{
                Id:this.rowId.Id,
                Languages__c:this.languages
            }}];
        this.saveRecords(recordInputs);
        this.closeModal();
    }
    handleSave(event){
        console.log('event',event.detail);
        console.log('event',JSON.stringify(event.detail.draftValues[0]));
        const recordInputs = event.detail.draftValues.map(record=>({
            fields:{...record}
        }));
        this.saveRecords(recordInputs);
  }
   saveRecords(recordInputs){
    const promises = recordInputs.map(recordInput=>updateRecord(recordInput));
    console.log('promises:',JSON.stringify(promises));
    
    Promise.all(promises)
    .then(() => {
        this.dispatchEvent(
            new ShowToastEvent({
                title:'Success',
                message:'Record Updated Successfully!',
                variant:'Success'
            })
            
    );
    this.draftValues = [];
    this.data=undefined;
    this.loadContacts();

 } )
        .catch((error)=>{
            this.dispatchEvent(
                new ShowToastEvent({
                    title:'Error',
                    message:error.body.message,
                    variant:'Error'}));

        });
   } 
}