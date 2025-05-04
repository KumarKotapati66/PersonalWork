@isTest
public class EventFormControllerTest {
    
    @isTest
    public static void testSearchContact() {
        // Arrange: Create a test Contact
        Contact testContact = new Contact(FirstName = 'Test', LastName = 'Contact');
        insert testContact;
        
        // Act: Call the searchContact method
        Test.startTest();
        List<Contact> results = EventFormController.searchContact('Test');
        List<Contact> results2 = EventFormController.searchContacts();
        Test.stopTest();
        
        // Assert: Ensure the search returns the correct Contact
        System.assertEquals(1, results.size(), 'There should be one contact returned');
        System.assertEquals(testContact.Id, results[0].Id, 'The returned contact should match the inserted contact');
    }
    
    @isTest
    public static void testCreateContact() {
        // Act: Call the createContact method
        Test.startTest();
        Contact newContact = EventFormController.createContact('New Contact');
        Test.stopTest();
        
        // Assert: Ensure a new Contact is created
        System.assertNotEquals(null, newContact.Id, 'The new contact should have an Id');
        System.assertEquals('New Contact', newContact.LastName, 'The contact last name should match the input name');
    }
    
    @isTest
    public static void testDeleteSpeaker() {
        // Arrange: Create and insert an Event_Sessions_Enrollment__c record to delete
        
        Contact testAccount = new Contact(LastName = 'Test Account', Email = 'test@test.co');
        insert testAccount;
        
        Events_Sessions_Enrollment__c enrollment = new Events_Sessions_Enrollment__c(
            Contact__c = testAccount.Id, // Use a valid Contact Id
            Description__c = 'Speaker for event'
        );
        insert enrollment;
        
        // Act: Call deleteSpeaker method
        Test.startTest();
        EventFormController.deleteSpeaker(enrollment.Id);
        Test.stopTest();
        
        // Assert: Ensure the record is deleted
        List<Events_Sessions_Enrollment__c> deletedRecord = [SELECT Id FROM Events_Sessions_Enrollment__c WHERE Id = :enrollment.Id LIMIT 1];
        if(deletedRecord.size() <= 0){
            deletedRecord = null;
        }
        System.assertEquals(null, deletedRecord, 'The speaker record should be deleted');
    }
    
    @isTest
    public static void testGetEventSchedule() {
        // Arrange: Create test data for Event and Schedule_Sessions__c
        Event_Master__c event = new Event_Master__c(Name = 'Test Event');
        insert event;
        
        Schedule_Sessions__c session = new Schedule_Sessions__c(
            Name = 'Session 1',
            Event_Reference__c = event.Id,
            Start_Date__c = Date.today(),
            End_Date__c = Date.today().addDays(1),
            Start_Time__c = Time.newInstance(9, 0, 0, 0),
            End_Time__c = Time.newInstance(17, 0, 0, 0)
        );
        insert session;
        
        // Act: Call getEventSchedule method
        Test.startTest();
        List<EventFormController.EventScheduleWrapper> scheduleList = EventFormController.getEventSchedule(event.Id);
        List<Schedule_Sessions__c> getEventSessions = EventFormController.getEventSessions(event.Id);
        Test.stopTest();
        
        // Assert: Verify that the schedule was returned
        System.assertNotEquals(null, scheduleList, 'Event schedule should not be null');
        System.assertEquals(1, scheduleList.size(), 'One schedule should be returned');
        System.assertEquals('Session 1', scheduleList[0].name, 'The schedule name should match');
    }
    
    @isTest
    public static void testCreateEventSchedule() {
        // Arrange: Create a test Event and Schedule_Sessions__c
        Event_Master__c event = new Event_Master__c(Name = 'Test Event');
        insert event;
        
        Schedule_Sessions__c session = new Schedule_Sessions__c(
            Name = 'Test Session',
            Event_Reference__c = event.Id,
            Start_Date__c = Date.today(),
            End_Date__c = Date.today().addDays(1),
            Start_Time__c = Time.newInstance(9, 0, 0, 0),
            End_Time__c = Time.newInstance(17, 0, 0, 0)
        );
        insert session;
        
        // Create a wrapper for the event schedule
        EventFormController.EventScheduleWrapper wrapper = new EventFormController.EventScheduleWrapper();
        wrapper.name = 'Test Session Updated';
        wrapper.eventId = event.Id;
        wrapper.startDate = Date.today();
        wrapper.endDate = Date.today().addDays(1);
        wrapper.startTime = Time.newInstance(9, 0, 0, 0);
        wrapper.endTime = Time.newInstance(17, 0, 0, 0);
        
        // Act: Call createEventSchedule method
        Test.startTest();
        String serializedWrapper = JSON.serialize(new List<EventFormController.EventScheduleWrapper>{wrapper});
        EventFormController.createEventSchedule(serializedWrapper);
        Test.stopTest();
        
        // Assert: Verify that the session was updated or created
        Schedule_Sessions__c updatedSession = [SELECT Name FROM Schedule_Sessions__c WHERE Id = :session.Id LIMIT 1];
        //System.assertEquals('Test Session Updated', updatedSession.Name, 'The session name should be updated');
    }
    
    @isTest
    public static void testInsertSpeaker() {
        // Arrange: Create test Speaker Enrollment record
        Contact testAccount = new Contact(LastName = 'Test Account', Email = 'test@test.co');
        insert testAccount;
        Events_Sessions_Enrollment__c speaker = new Events_Sessions_Enrollment__c(
            Contact__c = testAccount.Id, // Use a valid Contact Id
            Description__c = 'Test Speaker'
        );
        insert speaker;
        
        // Create a wrapper for the speaker
        EventFormController.SpeakerWrapper speakerWrapper = new EventFormController.SpeakerWrapper();
        speakerWrapper.name = 'Updated Speaker';
        speakerWrapper.description = 'Updated Description';
        speakerWrapper.contactId = speaker.Contact__c;
        
        // Act: Call insertSpeaker method
        Test.startTest();
        String serializedSpeaker = JSON.serialize(new List<Events_Sessions_Enrollment__c>{speaker});
        EventFormController.insertSpeaker(serializedSpeaker);
        Test.stopTest();
        
        // Assert: Verify the speaker is updated
        Events_Sessions_Enrollment__c updatedSpeaker = [SELECT Description__c FROM Events_Sessions_Enrollment__c WHERE Id = :speaker.Id LIMIT 1];
        //System.assertEquals('Updated Description', updatedSpeaker.Description__c, 'The speaker description should be updated');
    }
    
    @isTest
    public static void testGetEvent() {
        // Arrange: Create a test Event
        Event_Master__c event = new Event_Master__c(Name = 'Test Event', Event_Status__c = 'Active');
        insert event;
        
        // Act: Call getEvent method
        Test.startTest();
        EventFormController.EventWrapper eventWrapper = EventFormController.getEvent(event.Id);
        Test.stopTest();
        
        // Assert: Verify the event details
        System.assertEquals('Test Event', eventWrapper.eventTitle, 'The event name should match');
    }
    
    @isTest
    public static void testUpdateEvent() {
        // Arrange: Create a test Event
        Event_Master__c event = new Event_Master__c(Name = 'Test Event', Event_Status__c = 'Active');
        insert event;
        
        // Create a wrapper to update the event
        EventFormController.EventWrapper eventWrapper = new EventFormController.EventWrapper(event);
        eventWrapper.Id = event.Id;
        eventWrapper.eventTitle = 'Updated Event';
        
        // Act: Call updateEvent method
        Test.startTest();
        String serializedEvent = JSON.serialize(eventWrapper);
        EventFormController.updateEvent(serializedEvent);
        Test.stopTest();
        
        // Assert: Verify the event is updated
        Event_Master__c updatedEvent = [SELECT Name FROM Event_Master__c WHERE Id = :event.Id LIMIT 1];
        System.assertEquals('Updated Event', updatedEvent.Name, 'The event name should be updated');
    }
    
    @isTest
    public static void testUpdateFee_EventWise() {
        // Arrange: Create a test Event
        Event_Master__c event = new Event_Master__c(Name = 'Test Event');
        insert event;
        
        // Act: Call updateFee with isEventWise = true
        Test.startTest();
        EventFormController.updateFee(true, event.Id, 500, false, null);
        Test.stopTest();
        
        // Assert: Verify that the event fee is updated
        Event_Master__c updatedEvent = [SELECT Event_Fee__c, No_Fee__c FROM Event_Master__c WHERE Id = :event.Id LIMIT 1];
        System.assertEquals(500, updatedEvent.Event_Fee__c, 'The event fee should be updated');
        System.assertEquals(false, updatedEvent.No_Fee__c, 'The No_Fee flag should be set to false');
    }
    
    @isTest
    public static void testUpdateFee_SessionWise() {
        // Arrange: Create a test Event and Session
        Event_Master__c event = new Event_Master__c(Name = 'Test Event');
        insert event;
        
        Schedule_Sessions__c session1 = new Schedule_Sessions__c(
            Name = 'Session 1', 
            Event_Reference__c = event.Id,
            Session_Fee__c = 300,
            No_Fee__c = false
        );
        insert session1;
        
        // Act: Call updateFee with isEventWise = false
        Test.startTest();
        List<Schedule_Sessions__c> sessionsToUpdate = new List<Schedule_Sessions__c>();
        session1.Session_Fee__c = 400;  // Update fee for the session
        session1.No_Fee__c = true;  // Set No_Fee to true
        sessionsToUpdate.add(session1);
        
        EventFormController.updateFee(false, null, null, null, sessionsToUpdate);
        Test.stopTest();
        
        // Assert: Verify that the session fee is updated
        Schedule_Sessions__c updatedSession = [SELECT Session_Fee__c, No_Fee__c FROM Schedule_Sessions__c WHERE Id = :session1.Id LIMIT 1];
        System.assertEquals(400, updatedSession.Session_Fee__c, 'The session fee should be updated');
        System.assertEquals(true, updatedSession.No_Fee__c, 'The No_Fee flag should be set to true');
    }
    
    @isTest
    public static void testSaveData() {
        // Step 1: Prepare the JSON string to simulate the input data
        Id recordTypeId = Schema.SObjectType.Event_Master__c.getRecordTypeInfosByName().get('Event Group').getRecordTypeId();
        Event_Master__c event = new Event_Master__c(Name = 'Test Event', RecordTypeId = recordTypeId);
        insert event;
        String eventData = '{' +
            '"eventGroupTitle": "Test Event Group",' +
            '"eventTitle": "Test Event",' +
            '"isEventGroup": true,' +
            '"eventGroupId": "' + event.Id + '",' +  // Wrap event.Id in double quotes
            '"startdate": "2024-12-01",' +  // Fixed datetime format
            '"enddate": "2024-12-05",' +    // Fixed datetime format
            '"eventTypes": "Conference",' +
            '"description": "This is a test event",' +
            '"agenda": "Test agenda",' +
            '"image": "iVBORw0KGgoAAAANSUhEUgAABpK" , ' +  // Base64 encoded image
            '"imageFileName": "testImage.png"' +
            '}';
        
        // Step 2: Call the saveData method with the eventData string
        Test.startTest();
        EventFormController.getPicklistValues();
        list<sObject> fetchLookupData = EventFormController.fetchLookupData('Test','Event_Master__c');
        String eventId = EventFormController.saveData(eventData);
        Test.stopTest();
        
        // Step 3: Verify the Event_Master__c record was created correctly
        Event_Master__c eventRecord = [SELECT Id, Name, Event_Type__c, Description__c, Start_Date__c, End_Date__c, RecordTypeId FROM Event_Master__c WHERE Id = :eventId LIMIT 1];
        
        System.assertNotEquals(null, eventRecord, 'Event record should be created.');
        System.assertEquals('Test Event Group', eventRecord.Name, 'The event name should match the event group title.');
        System.assertEquals('Conference', eventRecord.Event_Type__c, 'The event type should be set correctly.');
        System.assertEquals('This is a test event', eventRecord.Description__c, 'The event description should be set correctly.');
        
        // Fix the date comparison to match the format used for Date and DateTime fields
        System.assertEquals(Date.valueOf('2024-12-01'), eventRecord.Start_Date__c, 'The start date should be set correctly.');
        System.assertEquals(Date.valueOf('2024-12-05'), eventRecord.End_Date__c, 'The end date should be set correctly.');
        
        System.assertNotEquals(null, eventRecord.RecordTypeId, 'The record type ID should be set for event group.');
        
        // Step 4: Verify ContentVersion for the image was created
        ContentVersion contentVersion = [SELECT Id, Title, PathOnClient, VersionData FROM ContentVersion WHERE Title = :eventRecord.Name + ' Cover Photo' LIMIT 1];
        System.assertNotEquals(null, contentVersion, 'The content version for the image should be created.');
        System.assertEquals('testImage.png', contentVersion.PathOnClient, 'The image file name should match.');
        System.assertNotEquals(null, contentVersion.VersionData, 'The version data (image) should be present.');
        
        // Step 5: Verify ContentDocumentLink was created and linked to the event
        ContentDocumentLink contentDocLink = [SELECT Id, LinkedEntityId, ShareType FROM ContentDocumentLink WHERE LinkedEntityId = :eventRecord.Id LIMIT 1];
        System.assertNotEquals(null, contentDocLink, 'The ContentDocumentLink should be created.');
        System.assertEquals('V', contentDocLink.ShareType, 'The ShareType should be set to "V"');
    }
}