@RestResource(urlMapping='/scheduleSessionHandler/*')
global with sharing class ken42_ScheduleSessionHandler {
     @HttpGET
    global static string sessionGetMethod(){
         RestRequest req = RestContext.request;
        String eventId = req.requestURI.substring(req.requestURI.lastIndexOf('/')+1);
        System.debug('eventId=='+eventId);
        if (String.isEmpty(eventId)) {
            throw new IllegalArgumentException('eventId must be provided.');
        }
        List<Schedule_Sessions__c> scheduleSessions = [SELECT Id, Name, Column__c,Location_Type__c,Session_Link__c, No_Fee__c,Session_Fee__c,End_Date__c, End_Time__c,(SELECT Id, Contact__r.Name,Contact__c,Speaker_Image__c, Description__c,Schedule_Sessions__c FROM Event_Session_Account_Associations__r) Event_Reference__c, Event_Type__c, Is_Active__c, Is_All_Day__c, Is_Archived__c, Is_Scheduled__c, Location__c, Schedule_Sessions_Id__c, Start_Date__c, Start_Time__c, Title__c, What_to_Expect_From_Event__c FROM Schedule_Sessions__c WHERE Event_Reference__c=:eventId];
        
        //Contacts List
         List<Contact> contactList = [
            SELECT Id, FirstName, LastName, Email, Phone 
            FROM Contact 
        ];
        
        getWrapper result = new getWrapper(scheduleSessions, contactList);
   		 return JSON.serialize(result);
    }
   @HttpDELETE
    global static void deleteSessions() {
        // Get the incoming request
        RestRequest req = RestContext.request;
        System.debug('req'+req);
        if (req.requestBody != null) {
            System.debug('req.requestBody'+req.requestBody);
            sessionIds deleteRecords = (sessionIds) JSON.deserialize(req.requestBody.toString(), sessionIds.class);
            System.debug('deleteRecords'+deleteRecords);
            
            List<Schedule_Sessions__c> scheduleSession = [SELECT Id, Name FROM Schedule_Sessions__c WHERE Id IN :deleteRecords.ids];
            
            if (scheduleSession.size() > 0) {
                delete scheduleSession;
            }
        } else {
            
            RestContext.response.statusCode = 400;
            RestContext.response.responseBody = Blob.valueOf('Invalid request: No session IDs provided.');
        }
    }

    
	 @HttpPOST
    global static void eventPostMethod(){
        System.debug(RestContext.request.requestBody.toString());
        scheduleSessionHandler(RestContext.request.requestBody.toString());
    }
    
     @HttpPATCH
    global static void eventPatchMethod(){
        System.debug(RestContext.request.requestBody.toString());
        updateScheduleSession(RestContext.request.requestBody.toString());
    }
    
    //POST METHOD
    public static void scheduleSessionHandler(String scheduleSessionWrapperDetails){
     
     List <sessionResponse> responseList = new List<sessionresponse>();
     List<Schedule_Sessions__c> sessionList = new List<Schedule_Sessions__c>();   
        List<scheduleSessionWrapper> request;
      try {
         request = (List<scheduleSessionWrapper>) JSON.deserialize(
            scheduleSessionWrapperDetails,
            List<scheduleSessionWrapper>.class
        );
    } catch (Exception e) {
        System.debug('Error deserializing JSON: ' + e.getMessage());
        throw new IllegalArgumentException('Invalid JSON format: ' + e.getMessage());
    }
       
        
        List<Event_Master__c> eventMaster = [SELECT Id, Name, RecordTypeId, End_Date__c, End_Time__c, Event_Group_Id__c, Event_Type__c, Event_banner__c, Evvent_Group__c, Is_Archived__c, Is_Scheduled__c, Is_Active__c, Location__c, Max_Allowed_Participants__c, Start_Date__c, Start_Time__c, Title__c, What_to_Expect_From_Event__c FROM Event_Master__c];
        List<Event_Booking__c> eventBooking = [SELECT Id, Name, Account__c, Billing_Details__c, Booked_for_No_of_Attendees__c, Contact__c, Event_Booking_Id__c, Is_Active__c, Type__c, Schedules_Sessions__c, Schedule_Sessions_Id__c FROM Event_Booking__c];
        //---------------------------------------------------------------------------------------------------------------------------------
           fflib_SObjectUnitOfWork uow = new fflib_SObjectUnitOfWork(new Schema.SObjectType[] {
                Schedule_Sessions__c.SObjectType,
                Events_Sessions_Enrollment__c.SObjectType
          });
        
        for (scheduleSessionWrapper eachEventSchedule : request) {
            
            System.debug('deserializespeaker----'+eachEventSchedule.speakers);
            
                
            
            Schedule_Sessions__c singleEventSchedule = eachEventSchedule.getRecord();
      
            	/*sessionResponse response = new sessionResponse();
                response.sessionId = singleEventSchedule.Id;
                response.sessionTitle = singleEventSchedule.Name;
                response.sessionImage = singleEventSchedule.Session_Broucher__c;
                responseList.add(response);*/
            
           if (String.isNotBlank(singleEventSchedule?.Id)) {
                // Register existing record for update
                uow.registerDirty(singleEventSchedule);
               sessionList.add(singleEventSchedule);
            } else {
                // Register new record for insertion
                uow.registerNew(singleEventSchedule);
                sessionList.add(singleEventSchedule);
            }
            if(eachEventSchedule.speakers!=null){
                
                      
            for (SpeakerWrapper speaker : eachEventSchedule.speakers) {
                System.debug('Speaker Name: ' + speaker.Id);
                System.debug('Speaker Description: ' + speaker.descriptionAboutTheSpeaker);
                Events_Sessions_Enrollment__c sessionSpeakerEnrollment = speaker.getSessionEnrollmentRecord();
                if (String.isNotBlank(singleEventSchedule?.Id)) {
                	sessionSpeakerEnrollment.Schedule_Sessions__c = singleEventSchedule?.Id;
                }
                 if (String.isNotBlank(sessionSpeakerEnrollment?.Id)) {
                    uow.registerDirty(sessionSpeakerEnrollment);
                } else {
                    	sessionSpeakerEnrollment.Schedule_Sessions__c = singleEventSchedule.Id;
                        uow.registerNew(sessionSpeakerEnrollment, Events_Sessions_Enrollment__c.Schedule_Sessions__c, singleEventSchedule);
                }
            }
            }	      
        }
        System.debug('before comit sessionList--'+sessionList);
        uow.commitWork();
        System.debug('sessionList--'+sessionList);
    //Post Commit to send response backk
    for(Schedule_Sessions__c eachsession:sessionList){
        sessionResponse response = new sessionResponse();
                response.sessionId = eachsession.Id;
                response.sessionTitle = eachsession.Name;
                response.sessionImage = eachsession.Session_Broucher__c;
                responseList.add(response);
    }
        
   
        RestApiUtility.createSuccessPostResponse(JSON.serialize(responseList));
    }
    
    //PATCH METHOD
    public static void updateScheduleSession(String scheduleSessionWrapperDetails){
        updateScheduleSessionWrapper request = (updateScheduleSessionWrapper) JSON.deserialize(
              scheduleSessionWrapperDetails,
              updateScheduleSessionWrapper.class
        );
        Schedule_Sessions__c session = new Schedule_Sessions__c(Id=request.sessionId);
        session.Session_Fee__c = request?.sessionFee;
        session.Start_Date__c = request?.startDate;
        session.End_Date__c = request?.endDate;
        session.Start_Time__c = request?.startTime;
        session.End_Time__c = request?.endTime;
        
        update session;
    }
    public class scheduleSessionWrapper{
        public string Id;
        public string sessionTitle;
        public String agenda;
        public Date startDate;
        public Date endDate;
        public Time startTime;
        public Time endTime;
        public Integer sessionFee;
        public Boolean noFee;
        public String sessionBroucher;
        public Boolean issessionBroucher;
        public String eventReference;
        public String locationType;
        public String locationAddress;
        public String sessionLink;
        public List<SpeakerWrapper> speakers;
        
        public scheduleSessionWrapper() {
            this.speakers = new List<SpeakerWrapper>();
        }
         public Schedule_Sessions__c getRecord() {
            String  sessionBroucherURL=' ';
            this.issessionBroucher = true;
            if((this.sessionBroucher !=null && this.sessionBroucher !='') && this.issessionBroucher){
               sessionBroucherURL = ken42_CreateContentVersion.createContentVersion(this.sessionTitle, this.sessionBroucher);
            }
        	System.debug('sessionBroucherURL==='+sessionBroucherURL);
             Schedule_Sessions__c session = new Schedule_Sessions__c();
             if(this.Id != null && this.Id !=''){
                 
            	session.Id = this.Id;
             }
             if(this.sessionTitle != null && this.sessionTitle !=''){
                 
            	session.Name = this.sessionTitle;
             }
              if(this.agenda != null && this.agenda !=''){
                 session.What_to_Expect_From_Event__c = this.agenda;
             }
              if(sessionBroucherURL != null && string.isNotBlank(sessionBroucherURL)){
                 session.Session_Broucher__c = sessionBroucherURL;
             }
              if(this.startDate != null){
                 session.Start_Date__c = this.startDate;
             }
              if(this.endDate != null){
                 session.End_Date__c = this.endDate;
             }
              if(this.startTime != null){
                 session.Start_Time__c = this.startTime;
             }
              if(this.endTime != null){
                 session.End_Time__c = this.endTime;
             }
              if(this.eventReference != null && this.eventReference !=''){
                 session.Event_Reference__c = this.eventReference;
             }
              if(this.locationType != null && this.locationType !=''){
                 session.Location_Type__c = this.locationType;
             }
              if(this.locationAddress != null && this.locationAddress !=''){
                 session.Location__c = this.locationAddress;
             }
              if(this.sessionLink != null && this.sessionLink !=''){
                 session.Session_Link__c = this.sessionLink; 
             }
              if(this.sessionFee != null){
                 session.Session_Fee__c = this.sessionFee;
             }
              if(this.noFee != null){
                 session.No_Fee__c = this.noFee;
             }
   
            return session;
                    
        }
        
    }
       public class SpeakerWrapper {
        public String Id { get; set; }
        public String speakerName { get; set; }
        public String descriptionAboutTheSpeaker { get; set; }
        public String speakerImage { get; set; }
        // Default Constructor
        public SpeakerWrapper() {}
        
        // Constructor to initialize the name and description from the related record
       /* public SpeakerWrapper(Events_Sessions_Enrollment__c speakerRecord) {
            this.name = speakerRecord.Contact__c != null ? speakerRecord.Contact__r.Name : '';
            this.description = speakerRecord.Description__c != null ? speakerRecord.Description__c : '';
            this.Id = speakerRecord.Id != null ? speakerRecord.Id : null;
            this.contactId = speakerRecord.Contact__c != null ? speakerRecord.Contact__c : null;
        }*/
        public Events_Sessions_Enrollment__c getSessionEnrollmentRecord(){
            
             String  speakerImageURL=' ';
            if(this.speakerImage !=null && string.isNotBlank(this.speakerImage)){
                System.debug('this.speakerImage---'+this.speakerImage);
               speakerImageURL = ken42_CreateContentVersion.createContentVersion('SpeakerImage', this.speakerImage);
                System.debug('this.speakerImageURL---'+speakerImageURL);
            }
            Events_Sessions_Enrollment__c speakerRecord = new Events_Sessions_Enrollment__c();
            if (this.descriptionAboutTheSpeaker != null && this.descriptionAboutTheSpeaker != '') {
                speakerRecord.Description__c = this.descriptionAboutTheSpeaker;
            }
            if (this.Id != null && this.Id != '') {
                speakerRecord.Id = this.Id;
            }
            if (string.isNotBlank(speakerImageURL)) {
                speakerRecord.Speaker_Image__c = speakerImageURL;
            }
            if (this.speakerName != null && this.speakerName != '') {
                speakerRecord.Contact__c = this.speakerName;
            }
            return speakerRecord;
        }
    }
    public class updateScheduleSessionWrapper{
        public Id sessionId;
        public Integer sessionFee;
        public Boolean noFee;
        public Date startDate;
        public Date endDate;
        public Time startTime;
        public Time endTime;
    }
    public class sessionResponse{
        public Id sessionId;
        public String sessionTitle;
        public String sessionImage;
    }
    public class sessionIds {
        public List<String> ids;
    }
    public class getWrapper {
    public List<Schedule_Sessions__c> sessions { get; set; }
    public List<Contact> contacts { get; set; }
    
    public getWrapper(List<Schedule_Sessions__c> sessions, List<Contact> contacts) {
        this.sessions = sessions;
        this.contacts = contacts;
    }
}
}