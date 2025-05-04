@isTest
public class eventSessionRegistrationTest {
    
    @isTest
    public static void testEventBookingGETMethod() {
        
        Event_Master__c em = new Event_Master__c(Name = 'Test');
        insert em;
        
        Account acc = new Account(Name = 'Test');
        insert acc;
        
        Contact con = new Contact(LastName = 'Test');
        insert con;
        
        Schedule_Sessions__c ss = new Schedule_Sessions__c(Name = 'Test', Event_Reference__c = em.Id);
        insert ss;
        // Create test data for Event_Booking__c
        Event_Booking__c eventBooking = new Event_Booking__c(
            //Name = 'Test Event Booking',
            Account__c = acc.Id,
            Billing_Details__c = 'Test Billing',
            Booked_for_No_of_Attendees__c = 10,
            Contact__c = con.Id,
            //Event_Booking_Id__c = 'EVT001',
            Is_Active__c = true,
            Type__c = 'Registered',
            Schedules_Sessions__c = ss.Id,
            Schedule_Sessions_Id__c = ss.Id
        );
        insert eventBooking;
        
        Test.startTest();
        
        // Prepare the REST API request with the Event ID
        RestContext.request = new RestRequest();
        RestContext.request.requestUri = '/services/apexrest/eventBookigRegistration/' + em.Id;
        RestContext.request.httpMethod = 'GET';
        
        // Call the method and assert the results
        List<Event_Booking__c> result = eventSessionRegistration.eventBookingGETMethod();
        
        Test.stopTest();
        
        // Assert that the event booking data is returned
        System.assertEquals(1, result.size());
        System.assertEquals(eventBooking.Id, result[0].Id);
    }
    
    @isTest
    public static void testDeleteEventRegistrations() {
        
        Event_Master__c em = new Event_Master__c(Name = 'Test');
        insert em;
        
        Account acc = new Account(Name = 'Test');
        insert acc;
        
        Contact con = new Contact(LastName = 'Test');
        insert con;
        
        Schedule_Sessions__c ss = new Schedule_Sessions__c(Name = 'Test', Event_Reference__c = em.Id);
        insert ss;
        // Create test data for Event_Booking__c
        Event_Booking__c eventBooking1 = new Event_Booking__c(
            //Name = 'Test Event Booking 1',
            Account__c = acc.Id,
            Billing_Details__c = 'Test Billing',
            Booked_for_No_of_Attendees__c = 10,
            Contact__c = con.Id,
            //Event_Booking_Id__c = 'EVT002',
            Is_Active__c = true,
            Type__c = 'Registered',
            Schedules_Sessions__c = ss.Id,
            Schedule_Sessions_Id__c = ss.Id
        );
        insert eventBooking1;
        
        Schedule_Sessions__c ss2 = new Schedule_Sessions__c(Name = 'Test2', Event_Reference__c = em.Id);
        insert ss2;
        
        Event_Booking__c eventBooking2 = new Event_Booking__c(
            //Name = 'Test Event Booking 2',
            Account__c = acc.Id,
            Billing_Details__c = 'Test Billing',
            Booked_for_No_of_Attendees__c = 15,
            Contact__c = con.Id,
            //Event_Booking_Id__c = 'EVT003',
            Is_Active__c = true,
            Type__c = 'Registered',
            Schedules_Sessions__c = ss2.Id,
            Schedule_Sessions_Id__c = ss2.Id
        );
        insert eventBooking2;
        
        // Prepare the request to delete the event bookings
        eventSessionRegistration.eventRegistrationIds deleteIds = new eventSessionRegistration.eventRegistrationIds();
        deleteIds.ids = new List<String>{ eventBooking1.Id, eventBooking2.Id };
            
            String body = JSON.serialize(deleteIds);
        
        Test.startTest();
        
        // Simulate the DELETE request
        RestContext.request = new RestRequest();
        RestContext.request.requestBody = Blob.valueOf(body);
        RestContext.request.httpMethod = 'DELETE';
        
        // Call the delete method
        eventSessionRegistration.deleteeventRegistrations();
        
        Test.stopTest();
        
        // Verify that the event bookings were deleted
        // Query for the deleted bookings
        List<Event_Booking__c> deletedBooking1List = [SELECT Id FROM Event_Booking__c WHERE Id = :eventBooking1.Id LIMIT 1];
        List<Event_Booking__c> deletedBooking2List = [SELECT Id FROM Event_Booking__c WHERE Id = :eventBooking2.Id LIMIT 1];
        
        // Assert that no records were returned, indicating they were deleted
        System.assertEquals(0, deletedBooking1List.size(), 'Event_Booking__c record with Id ' + eventBooking1.Id + ' was not deleted.');
        System.assertEquals(0, deletedBooking2List.size(), 'Event_Booking__c record with Id ' + eventBooking2.Id + ' was not deleted.');
        
    }
    
    @isTest
    public static void testEventBookingPostMethod() {
        // Create test data for Account, Contact, and Schedule_Sessions__c
        Account acc = new Account(Name = 'Test Account');
        insert acc;
        
        Contact con = new Contact(LastName = 'Test Contact');
        insert con;
        
        Event_Master__c em = new Event_Master__c(Name = 'Test Event Master');
        insert em;
        
        Schedule_Sessions__c ss = new Schedule_Sessions__c(Name = 'Test Schedule', Event_Reference__c = em.Id);
        insert ss;
        
        // Create a mock request body for the POST method
        // Here we use the Ids of the previously inserted records (Schedule_Sessions__c and Account)
       /* EventBookingRegistration__c customSetting = new EventBookingRegistration__c(
            Name = 'Test Setting',
            Is_Account_Based__c = true,
            SetupOwnerId = UserInfo.getUserId()  // Use the current user ID
        );
        insert customSetting;*/
        //Event_Setting__mdt  customSetting = [SELECT Id, DeveloperName, Label, Is_Account_Based__c FROM Event_Setting__mdt WHERE label ='EventRegistration'];
        String requestBody = '[{"numberOfAttendees": 5, "sessionId": "' + ss.Id + '", "AccountOrContactId": "' + con.Id + '"}]';
        
        Test.startTest();
        
        // Simulate the POST request
        RestContext.request = new RestRequest();
        RestContext.request.requestBody = Blob.valueOf(requestBody);
        RestContext.request.httpMethod = 'POST';
        
        // Call the POST method
        eventSessionRegistration.eventBookingPostMethod();
        
        Test.stopTest();
        
        // Verify that the event booking was inserted
        List<Event_Booking__c> eventBookings = [SELECT Id, Booked_for_No_of_Attendees__c FROM Event_Booking__c WHERE Contact__c = :con.Id];
        
        System.assertEquals(1, eventBookings.size());
        System.assertEquals(5, eventBookings[0].Booked_for_No_of_Attendees__c);
    }
}