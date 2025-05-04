@isTest
public class ken42_ScheduleSessionHandlerTest {
    @isTest
    static void testSessionGetMethod() {
        // Set up test data
        Event_Master__c eventMaster = new Event_Master__c(Name = 'Test Event');
        insert eventMaster;
        
        Schedule_Sessions__c session = new Schedule_Sessions__c(
            Name = 'Test Session',
            Event_Reference__c = eventMaster.Id,
            Start_Date__c = Date.today(),
            End_Date__c = Date.today().addDays(1)
        );
        insert session;
        
        Contact testContact = new Contact(FirstName = 'John', LastName = 'Doe', Email = 'test@example.com');
        insert testContact;
        
        // Set RestContext
        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/scheduleSessionHandler/' + eventMaster.Id;
        RestContext.request = req;
        
        RestResponse res = new RestResponse();
        RestContext.response = res;
        
        // Invoke the method
        String response = ken42_ScheduleSessionHandler.sessionGetMethod();
        System.assertNotEquals(null, response);
        System.debug('Response: ' + response);
    }
    
    @isTest
    static void testDeleteSessions() {
        // Set up test data
        Schedule_Sessions__c session = new Schedule_Sessions__c(
            Name = 'Session to Delete',
            Start_Date__c = Date.today(),
            End_Date__c = Date.today().addDays(1)
        );
        insert session;
        
        // Set RestContext
        RestRequest req = new RestRequest();
        ken42_ScheduleSessionHandler.sessionIds sessionObj = new ken42_ScheduleSessionHandler.sessionIds();
        sessionObj.ids = new List<String>{session.Id};
            req.requestBody = Blob.valueOf(JSON.serialize(sessionObj));
        RestContext.request = req;
        
        RestResponse res = new RestResponse();
        RestContext.response = res;
        
        // Invoke the method
        ken42_ScheduleSessionHandler.deleteSessions();
        
        // Verify the record was deleted
        List<Schedule_Sessions__c> deletedSession = [SELECT Id FROM Schedule_Sessions__c WHERE Id = :session.Id LIMIT 1];
        if(deletedSession.size() == 0){
            deletedSession = null;
        }
        System.assertEquals(null, deletedSession);
    }
    
    @isTest
    static void testEventPostMethod() {
        // Set up test data
        ken42_ScheduleSessionHandler.scheduleSessionWrapper sessionWrapper = new ken42_ScheduleSessionHandler.scheduleSessionWrapper();
        sessionWrapper.sessionTitle = 'New Session';
        sessionWrapper.startDate = Date.today();
        sessionWrapper.endDate = Date.today().addDays(1);
        
        List<ken42_ScheduleSessionHandler.scheduleSessionWrapper> requestList = new List<ken42_ScheduleSessionHandler.scheduleSessionWrapper>{sessionWrapper};
            
            // Set RestContext
            RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(requestList));
        RestContext.request = req;
        
        RestResponse res = new RestResponse();
        RestContext.response = res;
        
        // Invoke the method
        ken42_ScheduleSessionHandler.eventPostMethod();
        
        // Verify the session was created
        Schedule_Sessions__c createdSession = [SELECT Name FROM Schedule_Sessions__c WHERE Name = 'New Session' LIMIT 1];
        System.assertNotEquals(null, createdSession);
        System.assertEquals('New Session', createdSession.Name);
    }
    
    @isTest
    static void testEventPatchMethod() {
        // Set up test data
        Schedule_Sessions__c session = new Schedule_Sessions__c(
            Name = 'Session to Update',
            Start_Date__c = Date.today(),
            End_Date__c = Date.today().addDays(1),
            Session_Fee__c = 100
        );
        insert session;
        
        ken42_ScheduleSessionHandler.updateScheduleSessionWrapper updateWrapper = new ken42_ScheduleSessionHandler.updateScheduleSessionWrapper();
        updateWrapper.sessionId = session.Id;
        updateWrapper.sessionFee = 200;
        updateWrapper.startDate = Date.today().addDays(2);
        updateWrapper.endDate = Date.today().addDays(3);
        
        // Set RestContext
        RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(updateWrapper));
        RestContext.request = req;
        
        RestResponse res = new RestResponse();
        RestContext.response = res;
        
        // Invoke the method
        ken42_ScheduleSessionHandler.eventPatchMethod();
        Test.startTest();
        ken42_ScheduleSessionHandler.SpeakerWrapper ss = new ken42_ScheduleSessionHandler.SpeakerWrapper();
        Events_Sessions_Enrollment__c es = ss.getSessionEnrollmentRecord();
        Test.stopTest();
        
        // Verify the session was updated
        Schedule_Sessions__c updatedSession = [SELECT Session_Fee__c, Start_Date__c, End_Date__c FROM Schedule_Sessions__c WHERE Id = :session.Id LIMIT 1];
        System.assertEquals(200, updatedSession.Session_Fee__c);
        System.assertEquals(Date.today().addDays(2), updatedSession.Start_Date__c);
        System.assertEquals(Date.today().addDays(3), updatedSession.End_Date__c);
    }
}