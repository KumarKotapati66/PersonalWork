import { LightningElement, api, track } from 'lwc';
import getQuestionnaires from '@salesforce/apex/MenuController.getQuestionnaires';
import saveFeedback from '@salesforce/apex/MenuController.saveFeedback';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class RateThisMenu extends LightningElement {
    @api currentCategory;
    isModalOpen = false;
    @api menuId={};
    @api menuData;
    @track currentMenuItems;
    @track questionnaires=[];
    @track questionnaireResponses=[];
    starRating = 0;
    feedback = '';
    @track feedbackData = {}; 
    handleRateThisMenu() {
        //this.currentCategory = event.target.dataset.category;
        this.loadQuestionnaires(this.menuId[this.currentCategory]);
        const menuItems = this.menuData[this.currentCategory].items.map(item =>({
            ...item,
            IsLiked:"custom-icon",
            IsDisLiked:"custom-icon"
        }));
        console.log('this.menuItems--'+JSON.stringify(menuItems));
        this.currentMenuItems = [
                                    menuItems.slice(0, Math.ceil(menuItems.length / 2)),
                                    menuItems.slice(Math.ceil(menuItems.length / 2))
                                ];
        console.log('this.currentMenuItems--'+JSON.stringify(this.currentMenuItems));
       
        this.isModalOpen = true;
    }
     loadQuestionnaires(menuId) {
            getQuestionnaires({ recordId: menuId })
            .then(data => {
                this.questionnaires = data.map(questionnaire => ({
                    Id: questionnaire.Id,
                    label: questionnaire.Question_Label__c,
                    questionType:questionnaire.Question_Type__c,
                    required:questionnaire.Is_Required__c
                }));
                console.log('questionnaires--'+JSON.stringify(this.questionnaires));
                this.questionnaireResponses = data.map(questionnaire => ({
                    questionnaireId: questionnaire.Id,
                    required: questionnaire.Is_Required__c || false,
                    response: null 
                }));
                console.log('this.questionnaireResponses--'+JSON.stringify(this.questionnaireResponses));
            })
            .catch(error => {
                console.error(error);
            });     
        }
    get dynamicList(){
        let  dynamicQuestion= this.questionnaires
          .filter(questionnaire => questionnaire.questionType === 'Dynamic List')
          .map(questionnaire => ({
              ...questionnaire,
              menuItems: this.currentMenuItems
          }))|| [];
         console.log('dynamicQuestion--'+JSON.stringify(dynamicQuestion));
          return dynamicQuestion;
      }
      
      get ratingList(){
          let  dynamicQuestion= this.questionnaires
            .filter(questionnaire => questionnaire.questionType === 'Rating')
            .map(questionnaire => ({
                ...questionnaire,
                menuItems: this.currentMenuItems
            }))|| [];
           console.log('dynamicQuestion--'+JSON.stringify(dynamicQuestion));
            return dynamicQuestion;
        }
      get shortAnswerList(){
          let  dynamicQuestion= this.questionnaires
            .filter(questionnaire => questionnaire.questionType === 'Short Answer')
            .map(questionnaire => ({
                ...questionnaire,
                menuItems: this.currentMenuItems
            }))|| [];
           console.log('dynamicQuestion--'+JSON.stringify(dynamicQuestion));
            return dynamicQuestion;
        }
        closeModal() {
            this.isModalOpen = false;
            this.currentCategory = '';
            this.currentMenuItems = [];
            this.starRating = 0;
            this.feedback = '';
        }  
     handleThumbsUp(event) {
            const questionnaireId = event.target.dataset.questionnaireid;
            const itemName = event.target.dataset.item;
            console.log('item--'+itemName);
            this.currentMenuItems.forEach(menu => {
                // Loop through each item in the menu
                menu.forEach(item => {
                    console.log('item.Name--'+item.name);
                    // If the Name matches the itemName, update IsLiked
                    if(item.name === itemName && item.IsLiked === 'custom-icon'){
                        console.log('item.isLiked--'+item.IsLiked);
                        item.IsLiked = 'custom-icon-liked';
                        item.IsDisLiked = 'custom-icon';
                        return;
                    }
                    else if(item.name === itemName){
                        item.IsLiked = 'custom-icon';
                        return;
                    }
                    
                });
                
            });
            
            this.updateFeedback(itemName, 'like',questionnaireId);
        }
    
        handleThumbsDown(event) {
            const questionnaireId = event.target.dataset.questionnaireid;
            const itemName = event.target.dataset.item;
            console.log('item--'+itemName);
            this.updateFeedback(itemName, 'dislike',questionnaireId);
            this.currentMenuItems.forEach(menu => {
                // Loop through each item in the menu
                menu.forEach(item => {
                    console.log('item.Name--'+item.name);
                    // If the Name matches the itemName, update IsLiked
                    if(item.name === itemName && item.IsDisLiked === 'custom-icon'){
                        console.log('item.isLiked--'+item.IsDisLiked);
                        item.IsLiked = 'custom-icon';
                        item.IsDisLiked = 'custom-icon-liked';
                        //return;
                    }
                    else if(item.name === itemName){
                        item.IsDisLiked = 'custom-icon-liked';
                        //return;
                    }
                    
                });
                
            });
        }
    
        handleStarClick(event) {
            const questionnaireId = event.target.dataset.questionnaireid;
            const selectedIndex = event.target.dataset.index;
            this.starRating = this.starRating==selectedIndex? selectedIndex-1:selectedIndex;
            const selectedFeedback = this.starRating;
            const index = this.questionnaireResponses.findIndex(item => item.questionnaireId === questionnaireId);
            if (index !== -1) {
                this.questionnaireResponses[index].response =  selectedFeedback;
            } else {
                this.questionnaireResponses.push({ questionnaireId, selectedFeedback});
            }
            console.log('questionnaireResponses--'+JSON.stringify(this.questionnaireResponses));
        }
        get stars() {
            let starsArray = [];
            for (let i = 1; i <= 5; i++) {
                starsArray.push({
                    index: i,
                    iconName: i <= this.starRating ? 'utility:favorite' : 'utility:favorite_alt'
                });
            }
            return starsArray;
        } 
    
        handleFeedback(event) {
            this.feedback = event.target.value;
            const questionnaireId = event.target.dataset.questionnaireid;
            const selectedFeedback = this.feedback;
            const index = this.questionnaireResponses.findIndex(item => item.questionnaireId === questionnaireId);
            if (index !== -1) {
                this.questionnaireResponses[index].response =  selectedFeedback;
            } else {
                this.questionnaireResponses.push({ questionnaireId, selectedFeedback});
            }
            console.log('questionnaireResponses--'+JSON.stringify(this.questionnaireResponses));
        }
    
        updateFeedback(item, reaction,questionnaireId) {
            
            if (!this.feedbackData[this.currentCategory]) {
                this.feedbackData[this.currentCategory] = {};
            }
            this.feedbackData[this.currentCategory][item] = reaction;
            const selectedFeedback = JSON.stringify(this.feedbackData);
            const index = this.questionnaireResponses.findIndex(item => item.questionnaireId === questionnaireId);
            if (index !== -1) {
                this.questionnaireResponses[index].response =  selectedFeedback;
            } else {
                this.questionnaireResponses.push({ questionnaireId, selectedFeedback});
            }
            console.log('questionnaireResponses--'+JSON.stringify(this.questionnaireResponses));
    
        }
    
        submitFeedback() {
            console.log('menuId in submit:',this.menuId[this.currentCategory])
            // const feedbackPayload = {
            //     menuId:this.menuId[this.currentCategory],
            //     category: this.currentCategory,
            //     itemsFeedback: this.feedbackData[this.currentCategory],
            //     rating: this.starRating,
            //     additionalFeedback: this.feedback,
            // };
            const isValid = this.validateData();
            console.log('isValid--'+isValid);
            if (!isValid) {
                return;
            }
        
            const feedbackPayload = this.questionnaireResponses;
            saveFeedback({ feedbackData: feedbackPayload })
                .then(() => {
                    this.customShowToastEvent('Success', 'Feedback submitted successfully', 'success');
                    this.closeModal();
                    // Optionally show success toast
                })
                .catch((error) => {
                    this.customShowToastEvent('Error', 'Feedback not submitted', 'error');
                    console.error('Error saving feedback', error);
                });
        }
    validateData(){
        let isValid = true;
        console.log('this.questionnaireResponses--'+JSON.stringify(this.questionnaireResponses));
        this.questionnaireResponses.forEach(item => {
            if(item.required && item.response==null){
                this.customShowToastEvent('Error', 'Please provide required feedback response', 'error');
                isValid=false;
            }
        });
        return isValid;
    }    
    customShowToastEvent(title, message, variant) {
        const event = new ShowToastEvent({
            title:title,
            message:message,
            variant:variant});
            this.dispatchEvent(event);
    }
}