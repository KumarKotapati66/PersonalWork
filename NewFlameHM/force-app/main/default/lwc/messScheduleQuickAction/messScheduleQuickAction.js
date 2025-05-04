import { LightningElement, api, wire} from 'lwc';

export default class MessScheduleQuickAction extends LightningElement {

    @api recordId;
    menuType = 'Breakfast,Lunch,Snacks,Dinner';
}