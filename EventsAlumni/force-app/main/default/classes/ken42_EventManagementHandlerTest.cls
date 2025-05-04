@isTest
private class ken42_EventManagementHandlerTest {
    @isTest
    static void testEventGetMethod() {
        // Create sample Event_Master__c records
        List<Event_Master__c> events = new List<Event_Master__c>{
            new Event_Master__c(
                Name = 'Test Event 1',
                Event_Current_Step__c = 1,
                Language__c = 'English',
                Target_Keywords__c = 'Test, Event',
                Event_Status__c = 'In Progress',
                Event_Fee__c = 100.0,
                No_Fee__c = false,
                Start_Date__c = Date.today().addDays(1),
                End_Date__c = Date.today().addDays(2),
                Start_Time__c = Time.newInstance(10, 0, 0, 0),
                End_Time__c = Time.newInstance(12, 0, 0, 0),
                Description__c = 'Sample Event Description'
            ),
            new Event_Master__c(
                Name = 'Test Event 2',
                Event_Status__c = 'Completed',
                Start_Date__c = Date.today().addDays(-3),
                End_Date__c = Date.today().addDays(-2)
            )
        };
        insert events;

        // Set the request context
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();
        req.httpMethod = 'GET';
        RestContext.request = req;
        RestContext.response = res;

        // Call the GET method
        String jsonResponse = ken42_EventManagementHandler.eventGetMethod();

        // Verify the response
        System.assertNotEquals(null, jsonResponse);
        List<ken42_EventManagementHandler.eventWrapper> eventWrappers =
            (List<ken42_EventManagementHandler.eventWrapper>) JSON.deserialize(jsonResponse, List<ken42_EventManagementHandler.eventWrapper>.class);

        System.assertEquals(2, eventWrappers.size());
        System.assertEquals('Test Event 1', eventWrappers[0].eventTitle);
        System.assertEquals(true, eventWrappers[0].isUpcoming);
        System.assertEquals('Test Event 2', eventWrappers[1].eventTitle);
        System.assertEquals(false, eventWrappers[1].isUpcoming);
    }

    @isTest
    static void testEventPostMethod() {
        // Mock ContentVersion creation
        Test.startTest();
        Test.setMock(HttpCalloutMock.class, new MockContentVersionResponse());
        
        // Set the request context
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf('{"eventTitle":"Sample Event","category":"Conference","maximumNumberofParticipants":100,"description":"A test event","agenda":"Learn new things","languageOfDelivery":"English","startDate":"' + '2024-12-12' + '","endDate":"' + '2024-12-12' + '","startTime":"' + Time.newInstance(10,0,0,0) + '","endTime":"' + Time.newInstance(12,0,0,0) + '"}');
        RestContext.request = req;
        RestContext.response = res;

        // Call the POST method
        ken42_EventManagementHandler.eventPostMethod();

        // Verify that the event was created
        List<Event_Master__c> events = [SELECT Name, Description__c, Event_Type__c FROM Event_Master__c];
        System.assertEquals(1, events.size());
        System.assertEquals('Sample Event', events[0].Name);
        System.assertEquals('A test event', events[0].Description__c);
        System.assertEquals('Conference', events[0].Event_Type__c);

        Test.stopTest();
    }

    // Mock class for simulating ContentVersion creation
    private class MockContentVersionResponse implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"contentDocumentId":"mockContentDocId"}');
            return res;
        }
    }
}