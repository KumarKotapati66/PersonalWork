import { LightningElement  } from 'lwc';
import LightningModal from 'lightning/modal'
import OBJECT_API_NAME from '@salesforce/schema/Task';
import SUBJECT from '@salesforce/schema/Task.Subject';
import STATUS from '@salesforce/schema/Task.Status';
import RELATED_TO from '@salesforce/schema/Task.WhatId';
import PRIORITY from '@salesforce/schema/Task.Priority';
import NAME from '@salesforce/schema/Task.whoId';
import createTask from '@salesforce/apex/TaskController.createTask'
export default class TaskModal extends LightningModal {
 objectApiName = OBJECT_API_NAME.objectApiName;
 subject =SUBJECT.fieldApiName;
 status= STATUS.fieldApiName;
 relatedTo=RELATED_TO.fieldApiName;
 priority= PRIORITY.fieldApiName;
 name=NAME.fieldApiName;
 fields={Status:'',Subject:''};
connectedCallback(){
    console.log('Task Modal in Child Component',this.relatedTo,this.subject,this.status,this.name,this.priority);
}
  handleClose() {
    this.close('okay');
 }
 handleFieldChange(event) {
    const field = event.target.name;
    this.fields[field] = event.target.value;
    console.log('Inside handleFieldChange:',this.fields);
  }
 
  handleSave(){
      console.log('Inside handleSave:',this.fields);
      createTask({status:this.fields.Status,subject:this.fields.Subject})
      .then(()=>{
        this.handleClose();
      })
      .catch((error)=>{
        console.log('Error while creating Task:',error);
       })
  }
}