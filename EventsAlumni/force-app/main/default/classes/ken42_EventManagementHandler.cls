@RestResource(urlMapping='/eventManagementHandler/*')
global with sharing class ken42_EventManagementHandler {
	 @HttpGET
    global static String eventGetMethod(){
        List<Event_Master__c> allEvents = [SELECT Id, Name,Event_Current_Step__c,Language__c,Target_Keywords__c,Event_Status__c,Event_Broucher__c,Description__c,createdDate,Event_Fee__c,No_Fee__c, RecordTypeId, End_Date__c, End_Time__c, Event_Group_Id__c, Event_Type__c, Event_banner__c, Evvent_Group__c, Is_Archived__c, Is_Scheduled__c, Is_Active__c, Location__c, Max_Allowed_Participants__c, Start_Date__c, Start_Time__c, Title__c, What_to_Expect_From_Event__c FROM Event_Master__c];
         List<EventWrapper> eventWrappers = new List<EventWrapper>();

        Date today = Date.today();

        for (Event_Master__c event : allEvents) {
            Boolean isUpcoming = false;
            Boolean isPast = false;
            Boolean isInProgress = false;
            Boolean isCompleted = false;
            Boolean isCancel = false;
            Boolean isPending = false;
            
            if (event.Event_Status__c == 'In Progress') {
                isInProgress = true;
            } else if (event.Event_Status__c == 'Completed') {
                isCompleted = true;
            } else if (event.Event_Status__c == 'Cancel') {
                isCancel = true;
            } else if (event.Event_Status__c == 'Pending') {
                isPending =true;
            }
            
            if (event.Start_Date__c >= today) {
                isUpcoming = true;
            }

            // Set isPast based on start date
            if (event.Start_Date__c < today) {
                isPast = true;
            }
            
            // Create a wrapper object and add it to the list
            EventWrapper eventWrapper = new EventWrapper(event, isUpcoming, isPast, isInProgress, isCompleted, isCancel, isPending);
            eventWrappers.add(eventWrapper);
        }

        // Return the list of event wrappers
        return JSON.serialize(eventWrappers);
    }
    @HttpPOST
    global static void eventPostMethod(){
        System.debug(RestContext.request.requestBody.toString());
        eventHandler(RestContext.request.requestBody.toString());
    }
    public static void eventHandler(String eventWrapperDetails){
      String eventBroucherURL = ' ';
      String eventBannerURL =' ';
        eventWrapper request = (eventWrapper) JSON.deserialize(
              eventWrapperDetails,
              eventWrapper.class
        );
      	System.debug(request.eventTitle);
        request.isEventBroucher = true;
        if((request?.eventBroucher !=null && request?.eventBroucher !='') && request?.isEventBroucher){
           eventBroucherURL = ken42_CreateContentVersion.createContentVersion(request.eventTitle, request.eventBroucher);
        }
        if((request?.coverImageURL !=null && request?.coverImageURL !='')){
           eventBannerURL = ken42_CreateContentVersion.createContentVersion(request.eventTitle+'Cover Image', request.coverImageURL);
        }
        List<Event_Master__c> eventMaster = [SELECT Id, Name, RecordTypeId, End_Date__c, End_Time__c, Event_Group_Id__c, Event_Type__c, Event_banner__c, Evvent_Group__c, Is_Archived__c, Is_Scheduled__c, Is_Active__c, Location__c, Max_Allowed_Participants__c, Start_Date__c, Start_Time__c, Title__c, What_to_Expect_From_Event__c FROM Event_Master__c];
        List<Event_Booking__c> eventBooking = [SELECT Id, Name, Account__c, Billing_Details__c, Booked_for_No_of_Attendees__c, Contact__c, Event_Booking_Id__c, Is_Active__c, Type__c, Schedules_Sessions__c, Schedule_Sessions_Id__c FROM Event_Booking__c];
        List<Schedule_Sessions__c> scheduleSession = [SELECT Id, Name, Column__c, End_Date__c, End_Time__c, Event_Reference__c, Event_Type__c, Is_Active__c, Is_All_Day__c, Is_Archived__c, Is_Scheduled__c, Location__c, Schedule_Sessions_Id__c, Session_Fee__c, Start_Date__c, Start_Time__c, Title__c, What_to_Expect_From_Event__c FROM Schedule_Sessions__c];
        
        Event_Master__c event = new Event_Master__c();
        if(request.eventTitle !=null && request.eventTitle !=''){
            event.Name = request.eventTitle;
        }
        if(request.category !=null && request.category !=''){
            event.Event_Type__c = request.category;
        }
        if(request.maximumNumberofParticipants !=null){
            event.Max_Allowed_Participants__c = request.maximumNumberofParticipants;
        }

        if(request.description !=null && request.description !=''){
            event.Description__c = request.description;
        }
        if(request.agenda !=null && request.agenda !=''){
           event.What_to_Expect_From_Event__c = request.agenda;
        }
        if(request.suitablefor !=null && request.suitablefor !=''){
            event.Target_Audience_Applicable__c	 = request.suitablefor;
        }
        if(request.languageOfDelivery !=null && request.languageOfDelivery !=''){
            event.Language__c = request.languageOfDelivery;
        }
        if(request.startDate !=null){
            event.Start_Date__c = request.startDate;
        }
		
        if(request.endDate !=null){
            event.End_Date__c = request.endDate;
        }
        
        if(request.startTime !=null){
            event.Start_Time__c = request.startTime;
        }
        
        if(request.endTime !=null){
            event.End_Time__c = request.endTime;
        }
        
        if(eventBroucherURL !=null && string.isNotBlank(eventBroucherURL)){
            event.Event_Broucher__c = eventBroucherURL;
        }
        
        if(eventBannerURL !=null && string.isNotBlank(eventBannerURL)){
            event.Event_banner__c = eventBannerURL;
        }
        
        if(request.currentStep !=null){
            event.Event_Current_Step__c = request.currentStep;
        }
        
        if(request.targetKeyWords !=null && request.targetKeyWords !=''){
            event.Target_Keywords__c = request.targetKeyWords;
        }
        
        if(string.isNotBlank(request?.Id)){
           event.Id = request.Id;
            update event;
          }
        	else{
                 insert event;   
                }
        eventResponse response = new eventResponse();
        response.eventId=event.Id;
        response.name = event.Name;
        response.coverImage = event.Event_banner__c;
        response.brochureImage = event.Event_Broucher__c;
        response.currentStep = event.Event_Current_Step__c;
        RestApiUtility.createSuccessPostResponse(response);
        
    }
    
    public class eventWrapper{
        public string Id;
        public string eventTitle;
        public String category;
        public Decimal maximumNumberofParticipants;
        public String description;
        public String agenda;
        public String targetKeyWords;
        public String suitablefor;
        public String languageOfDelivery;
        public String eventBroucher;
        public Boolean isEventBroucher;
        public Date startDate;
        public Date endDate;
        public Time startTime;
        public Time endTime;
        public String coverImageURL;
        public Decimal currentStep;
        public Boolean isUpcoming;
        public Boolean ispast;
        public Boolean isInprogress;
        public Boolean isCompleted;
        public Boolean isCancel;
        public Boolean isPending;
        public Decimal eventFee;
        public Boolean eventNoFee;
        public Datetime createdDate;
     	public EventWrapper(Event_Master__c event, Boolean isUpcoming, Boolean ispast, Boolean isInprogress, Boolean isCompleted, Boolean isCancel, Boolean isPenidng){
            this.Id = event.Id;
            this.eventTitle = event.Name;
            this.category = event.Event_Type__c;
            this.startdate = event.Start_Date__c;
            this.enddate = event.End_Date__c;
            this.startTime = event.Start_Time__c;
            this.endTime = event.End_Time__c;
            this.description = event.Description__c;
            this.agenda =event.What_to_Expect_From_Event__c;
            this.coverImageURL = event.Event_banner__c;
            this.eventBroucher = event.Event_Broucher__c;
            this.currentStep = event.Event_Current_Step__c;
            this.languageOfDelivery = event.Language__c;
            this.eventFee = event.Event_Fee__c;
            this.eventNoFee = event.No_Fee__c;
            this.maximumNumberofParticipants = event.Max_Allowed_Participants__c;
            this.targetKeyWords = event.Target_Keywords__c;
            this.createdDate = event.CreatedDate;   
            this.isUpcoming = isUpcoming;
            this.ispast = ispast;
            this.isInprogress = isInprogress;
            this.isCompleted = isCompleted; 
            this.isCancel = isCancel; 
            this.isPending = isPending;   
        }
    }
    
    public class eventResponse{
        public Id eventId;
        public String name;
        public string coverImage;
        public String brochureImage;
        public Decimal currentStep;
    }
    
   /* public class getEventWrapper{
         public Map<string, List<Event_Master__c>> events { get; set; }
       // public List<Contact> contacts { get; set; }
        
        public getEventWrapper(Map<string, List<Event_Master__c>>  events) {
            this.events = events;
            //this.contacts = contacts;
        }
    }*/
}