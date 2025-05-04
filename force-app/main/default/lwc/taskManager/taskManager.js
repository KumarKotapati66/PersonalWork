import { LightningElement, track, wire } from 'lwc';
import USER_ID from '@salesforce/user/Id';
import getTaskData from '@salesforce/apex/TaskController.getTaskData';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex }  from '@salesforce/apex';
import TaskModal from 'c/taskModal';

export default class TaskManager extends LightningElement {
    @track taskData;
    taskResult;
    @wire(getTaskData, {userId:USER_ID})
    wiredTask(result){
        this.taskResult = result;
        if(result.data){
           
            this.taskData = result.data
            console.log('taskList:',this.taskResult);
            this.showToastMessage('Success','Task List Retrieved Successfully','success');
        }
        if(result.error){
                this.taskData=undefined;
                console.log('error occured:',error);
                this.showToastMessage('Error','Error Occured While Retrieving Task List','error');
      }
     }
    connectedCallback(){
        console.log('user id:',USER_ID);
        console.log('taskList:',this.taskResult);
    }
    
    handleRefresh(){    
        //this.template.querySelector('lightning-datatable').refresh();
        refreshApex(this.taskResult);
    }
    handleSuccess(){
        this.showToastMessage('Success','Task Created Successfully','success');
        this.handleRefresh();
    }
    handleUpdate(event){
        console.log('Status updated---')
        console.log(event.detail);
       
        this.showToastMessage('Success','Task Updated Successfully','success');
        this.handleRefresh();
    }
    async handleOpenModal(){
           const result =  await TaskModal.open({
             size:'medium'            
           });
           console.log('result:',result);
           if(result){
               
               this.handleSuccess();
           }
    }
    
    showToastMessage(message,title,variant){
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant,
                mode: 'piester'
            })
        );
    }
}