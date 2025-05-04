import { LightningElement, wire } from 'lwc';
import {subscribe, MessageContext} from 'lightning/messageService'
import MY_MESSAGE_CHANNEL from '@salesforce/messageChannel/MyMessageChannel__c'

export default class Subscribe extends LightningElement {
    @wire(MessageContext) messageContext;
    receivedMessage;
    connectedCallback(){
        this.subscribeToMessageChannel();
    }

    subscribeToMessageChannel(){
        subscribe(this.messageContext, MY_MESSAGE_CHANNEL, (message)=>{this.receivedMessage = message.data; });
    }
}