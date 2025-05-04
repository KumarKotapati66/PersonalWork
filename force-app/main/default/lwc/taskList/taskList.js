import { LightningElement, api, track } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import updateTask from '@salesforce/apex/TaskController.updateTask'
const COLUMNS = [
    {
    label: 'Task Subject',
     fieldName: 'Subject',
     type: 'text',
     hideDefaultActions: true,
    },
    {
        label:'Status',
        fieldName: 'Status',
        hideDefaultActions: true,
    }
];
export default class TaskList extends LightningElement {
  @api taskData;
  columns=COLUMNS;
  selectedRows;
  connectedCallback(){
    console.log('Task List in child component:',this.taskData);
  }
  handleRowSelection(event){
    console.log('Row Selected:',event.detail.selectedRows);
     this.selectedRows = event.detail.selectedRows;
    
  }
  handleTaskUpdate(){
    console.log('Update Records:',this.selectedRows);
    updateTask({taskList: this.selectedRows})
   .then(() => {
    this.resetSelection();
      this.dispatchEvent(new CustomEvent('complete',{detail:'Status Update'}));
    })
    .catch((error) => {
      console.log(
        'Error while updating records',
        error)
    });
  }
  resetSelection() {
    this.selectedRows = []; // Reset selection
    this.template.querySelector('lightning-datatable').selectedRows = []; // Clear table selection
}

}