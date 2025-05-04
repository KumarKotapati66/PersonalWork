import { LightningElement, api, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";

export default class CreateEventSetup extends NavigationMixin(
  LightningElement
) {
  @api recordId;
  @track isEventSetup = true;
  @track isFeeSetup=true;
  @track isEventWise;
  @track isSessionWise
  @track state = {
    currentState: "eventSetup",
    eventRecordId: ""
  };
  @track barValue;
  steps = [
    { label: "Event setup", value: "eventSetup" },
    { label: "Target audience", value: "targetAudience" },
    { label: "Schedule setup", value: "scheduleSetup" },
    { label: "Fee setup", value: "feeSetup" },
    { label: "Summary", value: "summary" }
  ];
  
  get currentStep() {
    return this.state.currentState;
  }
  get isEventSetup(){
    console.log('this.isEventSetup=='+this.isEventSetup);
    return this.isEventSetup;
  }
  get progressBarValue() {
        const totalSteps = this.steps.length;
        const currentIndex = this.steps.findIndex(step => step.value === this.currentStep);
        if (totalSteps === 0) {
            return 0;
        }
        return ((currentIndex) / totalSteps) * 100;
    }
  get currentStepLabel() {
        const stepIndex = this.steps.findIndex(step => step.value === this.currentStep);
        return `Step ${stepIndex + 1} out of ${this.steps.length}`;
    }
    
  get eventRecordId() {
    console.log('this.recordId===='+this.recordId);
    this.state.eventRecordId = this.recordId
      ? this.recordId
      : this.state.eventRecordId;
    return this.state.eventRecordId;
  }

  get showEvent() {
    return this.state.currentState === "eventSetup";
  }
   get showTargetAudience() {
    return this.state.currentState === "targetAudience";
  }
  get showEventSchedule() {
    console.log('Inside showEventSchedule--'+this.state.currentState);
    return this.state.currentState === "scheduleSetup";
  }

  get showFeeSetup() {
    console.log('isEventWise--'+this.isEventWise);
    console.log('sessionwise--'+this.isSessionWise);
    return this.state.currentState === "feeSetup";
  }
  get showSummary() {
    return this.state.currentState === "summary";
  }
   handleEvent({detail}) {
    console.log('Handling on event recordID---'+detail.eventId);
    this.recordId = detail.eventId;
    this.state.currentState = "targetAudience";

  }
   handleTargetAudience({detail}) {
    console.log('Handling target audience, eventId:', detail.eventId);
    this.recordId = detail.eventId;
    console.log('Handling target audience, recordId:', this.recordId);
    //setTimeout(() => {
      this.state.currentState = "scheduleSetup";
    //},5000);
    
    console.log('TargetAudienceSetup---'+this.state.currentState);
  }
  handlePrevious({detail}) {
    if(detail === 'scheduleSetup'){
      this.isEventWise = false;
      this.isSessionWise = false;
    }
    
    this.state.currentState = detail;
    
  }
  
   handleEventSchedule({detail}) {
    console.log('Handling event schedule, eventId:', detail.eventId);
    this.recordId = detail.eventId;
    
    this.state.currentState = "feeSetup";
    console.log('Current State:', this.state.currentState);
    console.log('value: '+ detail.value + ',type:'+ detail.type);
    
    if(detail.type == 'Event'){
      this.isEventWise = detail.value;
    }else if(detail.type == 'Session'){
      this.isSessionWise = detail.value;
    }
    
    /*this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: this.eventRecordId,
        actionName: "view"
      }
    });*/
  }
  get feeSetup(){
    return this.isFeeSetup;
  }

  handleFeeSetup({detail}) {
    console.log('handleFeeSetupParent:', detail.eventId);
    this.recordId = detail.eventId;
    this.state.currentState = "summary";
    console.log('Current State:', this.state.currentState);
  }
  handleSummary(){
    /*this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: this.eventRecordId,
        actionName: "view"
      }
    });*/
  }
}