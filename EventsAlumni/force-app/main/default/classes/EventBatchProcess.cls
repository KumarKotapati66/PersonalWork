public class EventBatchProcess implements Database.Batchable<SObject>, Database.AllowsCallouts {
   private List<Id> recordIds;
   private String emailsToSend;
   public class EmailMessageWrapper {
    public List<String> toAddresses;
    public String subject;
    public String plainTextBody;
   } 
    public EventBatchProcess(String emailsToSend) {
        this.emailsToSend = emailsToSend;
    }

    public Database.QueryLocator start(Database.BatchableContext BC) {
        return Database.getQueryLocator([SELECT Id, Name,Invite_All__c FROM Event_Target_Audience__c LIMIT 1]);
    }

    public void execute(Database.BatchableContext BC, List<Event_Target_Audience__c> scope) {
        Set<Id> accountIds = new Set<Id>();
        List<String> sectors = new List<String>();
        List<String> constituitionRoles = new List<String>();
        List<String> emailList = new List<string>();
        List<Messaging.SingleEmailMessage> messageList = new List<Messaging.SingleEmailMessage>();
        List<EmailMessageWrapper> emailWrappers = (List<EmailMessageWrapper>)JSON.deserialize(emailsToSend, List<EmailMessageWrapper>.class);
        for(EmailMessageWrapper emailWrapper:emailWrappers){
             Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
            email.setToAddresses(emailWrapper.toAddresses);
            email.setSubject(emailWrapper.subject);
            email.setPlainTextBody(emailWrapper.plainTextBody);
			messageList.add(email);
        }
         Messaging.sendEmail(messageList);
        /*for (Event_Target_Audience__c eventTarget : scope) {
         
        }
        for(Contact contact:[Select id,Email,Event_Reminder_Email_Id__c FROM Contact WHERE Event_Reminder_Email_Id__c='eventReminder@yopmail.com']){
            if(contact.Event_Reminder_Email_Id__c!=null){
                emailList.add(contact.Event_Reminder_Email_Id__c);
            }
        }
        sendEmailNotification(emailList);*/
    }

    public void finish(Database.BatchableContext BC) {
        // Additional operations after batch completes (optional)
    }

    private void sendEmailNotification(List<String> emailList) {
       /* Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(emailList);
        email.setSubject('Batch Process');
        email.setPlainTextBody('Hi New Event Created');

        try {
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
        } catch (Exception e) {
            System.debug('Failed to send email: ' + e.getMessage());
        }*/
    }
}