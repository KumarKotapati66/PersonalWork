import { LightningElement, track } from 'lwc';
import loadById from '@salesforce/apex/InfiniteLoadingController.loadById';
import loadMoreData from '@salesforce/apex/InfiniteLoadingController.loadMoreData';
import totalRecords from '@salesforce/apex/InfiniteLoadingController.totalRecords';

const actions = [
    { label: 'Show details', name: 'show_details' },
    { label: 'Delete', name: 'delete' }
];
const columns = [
    { label: 'Name', fieldName: 'Name', type:'button',
        typeAttributes:{
            label: {fieldName: 'Name'},
            name: {fieldName: 'Name'},
            variant:'brand'},},
    { label: 'Industry', fieldName: 'Industry',
        cellAttributes: {
        iconName: 'utility:home',
        iconPosition: 'left',
       },
   },
    { label: 'Rating', fieldName: 'Rating'},
   
];

export default class InfiniteLoading extends LightningElement {
    data = [];
    columns = columns;
    totalRecords =0;
    recordsLoaded =0;

    connectedCallback(){
        this.loadData();
    }
    async loadData(){
        try{
            this.totalRecords = await totalRecords();
            this.data = await loadById();
            this.recordsLoaded = this.data.length;
        }catch(error){
            console.log('Error while loading data:',error);
        }
    }

    async loadMoreData(event){
        try{
            console.log('event:',JSON.stringify(event.deail));
            const{target} = event;
            target.isLoading = true;
            //target.loadMoreStatus = 'Loading Records...';
            if (this.recordsLoaded < this.totalRecords) {
                console.log('All records are already loaded.');
                const currentRecords = this.data;
                const lastRecord = currentRecords[currentRecords.length -1];
               const newRecords = await loadMoreData({lastName: lastRecord.name, lastId: lastRecord.Id});
               this.data = [...currentRecords, ...newRecords];
               this.recordsLoaded += newRecords.length;
                target.isLoading = false;
            }
    
            
        }catch(error){
            console.log('Error while loading more data:',error);
        }
    }
}