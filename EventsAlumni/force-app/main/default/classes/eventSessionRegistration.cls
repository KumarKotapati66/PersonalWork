@RestResource(urlMapping='/eventBookigRegistration/*')
global with sharing class eventSessionRegistration {
     @HttpGET
    global static List<Event_Booking__c> eventBookingGETMethod(){
        //System.debug(RestContext.request.requestBody.toString());
                 RestRequest req = RestContext.request;
        String eventId = req.requestURI.substring(req.requestURI.lastIndexOf('/')+1);
         List<Event_Booking__c> eventBookingList = [SELECT Id, Name, Account__c, Billing_Details__c, Booked_for_No_of_Attendees__c, Contact__c, Event_Booking_Id__c, Is_Active__c, Type__c, Schedules_Sessions__c, Schedule_Sessions_Id__c FROM Event_Booking__c WHERE Schedules_Sessions__r.Event_Reference__c =:eventId];
        return eventBookingList;
    }
     @HttpDELETE
    global static void deleteeventRegistrations() {
        // Get the incoming request
        RestRequest req = RestContext.request;
        System.debug('req'+req);
        if (req.requestBody != null) {
            System.debug('req.requestBody'+req.requestBody);
            eventRegistrationIds deleteRecords = (eventRegistrationIds) JSON.deserialize(req.requestBody.toString(), eventRegistrationIds.class);
            System.debug('deleteRecords'+deleteRecords);
            List<Event_Booking__c> eventBookings;
        if (!deleteRecords.ids.isEmpty()) {
             eventBookings = [
                SELECT Id, Name, Account__c, Billing_Details__c, Booked_for_No_of_Attendees__c, 
                       Contact__c, Event_Booking_Id__c, Is_Active__c, Type__c, 
                       Schedules_Sessions__c, Schedule_Sessions_Id__c 
                FROM Event_Booking__c 
                WHERE Id IN :deleteRecords.ids
            ];
        }            
            if (!eventBookings.isEmpty()) {
                delete eventBookings;
            }
            } else {
                
                RestContext.response.statusCode = 400;
                RestContext.response.responseBody = Blob.valueOf('Invalid request: No eventbooking IDs provided.');
            }
    }

     @HttpPOST
    global static void eventBookingPostMethod(){
        System.debug(RestContext.request.requestBody.toString());
        registerEventSession(RestContext.request.requestBody.toString());
    }
    
    public static void registerEventSession(string bookingDetails){
     // List<Event_Booking__c> eventBooking = [SELECT Id, Name, Account__c, Billing_Details__c, Booked_for_No_of_Attendees__c, Contact__c, Event_Booking_Id__c, Is_Active__c, Type__c, Schedules_Sessions__c, Schedule_Sessions_Id__c FROM Event_Booking__c];
        List<Event_Booking__c> eventBookingList = new List<Event_Booking__c>();
        List <registerEventSessionWrapper> responseList = new List<registerEventSessionWrapper>();
        List<Schedule_Sessions__c> sessionList = new List<Schedule_Sessions__c>();   
            List<registerEventSessionWrapper> request;
          try {
             request = (List<registerEventSessionWrapper>) JSON.deserialize(
                bookingDetails,
                List<registerEventSessionWrapper>.class
                );
            } catch (Exception e) {
                System.debug('Error deserializing JSON: ' + e.getMessage());
                throw new IllegalArgumentException('Invalid JSON format: ' + e.getMessage());
            }
        
            for(registerEventSessionWrapper eachBooking:request){
                Event_Booking__c eventBooking = eachBooking.getRecord();
                eventBookingList.add(eventBooking);
            }
            if(!eventBookingList.isEmpty()){
                insert eventBookingList;
            }
            for(Event_Booking__c eventBooking:eventBookingList){
                 registerEventSessionWrapper response = new registerEventSessionWrapper();
                response.sessionId = eventBooking.Schedules_Sessions__c;
                response.numberOfAttendees = eventBooking.Booked_for_No_of_Attendees__c;
                response.accountId = eventBooking.Account__c;
                response.contactId = eventBooking.Contact__c;
                responseList.add(response);
            }
        	RestApiUtility.createSuccessPostResponse(JSON.serialize(responseList));
    	}
    
    public class registerEventSessionWrapper{
        public Decimal numberOfAttendees;
        public string sessionId;
        public string Id;
        public string AccountOrContactId;
        public string accountId;
        public string contactId;
        public registerEventSessionWrapper(){
            
        }
        
        public Event_Booking__c getRecord(){
            //EventBookingRegistration__c customSetting = [SELECT Id, Is_Account_Based__c, Name, SetupOwnerId FROM EventBookingRegistration__c Limit 1];
            Event_Setting__mdt customSetting = [SELECT Id, DeveloperName, Label, Is_Account_Based__c FROM Event_Setting__mdt WHERE label ='EventRegistration' Limit 1];
            Event_Booking__c eventBooking = new Event_Booking__c();
            
            if(this.numberOfAttendees !=null){
                eventBooking.Booked_for_No_of_Attendees__c = this.numberOfAttendees;
            }
            if(string.isNotBlank(this.sessionId)){
                eventBooking.Schedules_Sessions__c = this.sessionId;
            }   
            if(string.isNotBlank(this.AccountOrContactId) && customSetting?.Is_Account_Based__c == true){
                eventBooking.Account__c = this.AccountOrContactId;
            }
            else if(string.isNotBlank(this.AccountOrContactId)){
                eventBooking.Contact__c = this.AccountOrContactId;
            } 
            return eventBooking;
        }
    }
    
    public class eventRegistrationIds {
        public List<String> ids;
    }
}