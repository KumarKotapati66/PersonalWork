@IsTest
public class EventTargetAudience_Test {
@TestSetup
    static void testData(){
        /*** Insert Event ***/
        Event_Master__c event = new Event_Master__c(Name = 'Test Event');
        insert event;
        
        /*** Insert Contact ***/
        Contact contact = new Contact();
        contact.FirstName = 'Test';
        contact.LastName = 'Contact';
        contact.Event_Reminder_Email_Id__c = 'TestContact@yopmail.com';
        
        insert contact;
    }
    @IsTest
    static void testEventTargetAudience(){
        List<Event_Master__c> event = [SELECT Id, Name FROM Event_Master__c LIMIT 1];
        
        System.assertEquals(1,event.size());
        Event_Target_Audience__c ETA = new Event_Target_Audience__c();
        ETA.Invite_All__c = true;
        ETA.Event_Master__c = event[0].Id;
        insert ETA;
        Event_Target_Audience__c insertedETA = [SELECT Id, Invite_All__c FROM Event_Target_Audience__c WHERE Id = :ETA.Id];
        
        System.assertEquals(true, insertedETA.Invite_All__c, 'The Invite_All field should be true.');
    }
}