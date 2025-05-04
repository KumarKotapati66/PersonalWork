import { LightningElement, wire } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import MY_MESSAGE_CHANNEL  from '@salesforce/messageChannel/MyMessageChannel__c';

export default class Publish extends LightningElement {
    @wire(MessageContext) messageContext;

    handleClick() {
        const message = { data: 'Hello, From Publisher' };
         publish(this.messageContext, MY_MESSAGE_CHANNEL, message);
        };
}