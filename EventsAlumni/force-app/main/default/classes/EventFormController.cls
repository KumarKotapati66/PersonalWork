public with sharing class EventFormController {
    
    @AuraEnabled(cacheable=true)
    public static List<Contact> searchContact(String searchKey) {
        String query = '%' + searchKey + '%';
        return [SELECT Id, Name FROM Contact WHERE Name LIKE :query LIMIT 10];
    }
    
    @AuraEnabled
    public static Contact createContact(String name) {
        Contact newContact = new Contact();
        newContact.LastName = name;
        insert newContact;
        return newContact;
    }
    @AuraEnabled
    public static void deleteSpeaker(String recordId) {
        delete [select Id from Events_Sessions_Enrollment__c WHERE Id=:recordId];
    }
    
    @AuraEnabled
    public static List<EventScheduleWrapper> getEventSchedule(String recordId) {
        try {
            set<Id> sessionId = new set<Id>();
            System.debug('recordId----'+recordId);
            List<Schedule_Sessions__c> eventSchedule = [
                SELECT
                Id,
                What_to_Expect_From_Event__c,
                Name,(SELECT Id, Contact__r.Name,Contact__c, Description__c,Speaker_Image__c,Schedule_Sessions__c FROM Event_Session_Account_Associations__r),
                Session_Broucher__c,
                Event_Reference__c,
                Start_Date__c,
                Start_Time__c,
                End_Time__c,
                Location_Type__c,
                Session_Link__c,
                Location__c,
                End_Date__c,
                Session_Fee__c,
                No_Fee__c
                FROM Schedule_Sessions__c
                WHERE Event_Reference__c = :recordId
            ];
            
            List<EventScheduleWrapper> eventScheduleList = new List<EventScheduleWrapper>();
            if(!eventSchedule.isEmpty()){
                for (Schedule_Sessions__c eachSchedule : eventSchedule) {
                    sessionId.add(eachSchedule.Id);
                    EventScheduleWrapper eventSc = new EventScheduleWrapper(eachSchedule);
                    eventScheduleList.add(eventSc);
                }
                return eventScheduleList;
            }
            
            return null;
            
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    @AuraEnabled
    public static void createEventSchedule(String records) {
        System.debug('records==='+records);
        List<EventScheduleWrapper> requestBody = (List<EventScheduleWrapper>) JSON.deserialize(
            records,
            List<EventScheduleWrapper>.class
        );
        
        if (requestBody.isEmpty()) {
            return;
        }
        List<Schedule_Sessions__c> eventScheduleToUpdate = new List<Schedule_Sessions__c>();
        Set<String> existingRecId = new Set<String>();
        
        List<Events_Sessions_Enrollment__c> sessionSpeakerEnrollmentList = new List<Events_Sessions_Enrollment__c>();
        List<Events_Sessions_Enrollment__c> insertsessionSpeakerEnrollmentList = new List<Events_Sessions_Enrollment__c>();
        
        Map<Schedule_Sessions__c, List<Events_Sessions_Enrollment__c>> newSessionMap = new Map<Schedule_Sessions__c, List<Events_Sessions_Enrollment__c>>();
        // Create an instance of UnitOfWork
        fflib_SObjectUnitOfWork uow = new fflib_SObjectUnitOfWork(new Schema.SObjectType[] {
            Schedule_Sessions__c.SObjectType,
                Events_Sessions_Enrollment__c.SObjectType
                });
        
        for (EventScheduleWrapper eachEventSchedule : requestBody) {
            System.debug('deserializespeaker----'+eachEventSchedule.speakers);
            
            Schedule_Sessions__c singleEventSchedule = eachEventSchedule.getRecord();
            
            if (String.isNotBlank(singleEventSchedule?.Id)) {
                existingRecId.add(singleEventSchedule.Id);
                // Register existing record for update
                uow.registerDirty(singleEventSchedule);
            } else {
                // Register new record for insertion
                uow.registerNew(singleEventSchedule);
                newSessionMap.put(singleEventSchedule, new List<Events_Sessions_Enrollment__c>());
            }
            eventScheduleToUpdate.add(singleEventSchedule);
            
            for (SpeakerWrapper speaker : eachEventSchedule.speakers) {
                System.debug('Speaker Name: ' + speaker.name);
                System.debug('Speaker Description: ' + speaker.description);
                Events_Sessions_Enrollment__c sessionSpeakerEnrollment = speaker.getSessionEnrollmentRecord();
                if (String.isNotBlank(singleEventSchedule?.Id)) {
                    sessionSpeakerEnrollment.Schedule_Sessions__c = singleEventSchedule?.Id;
                } else {
                    // Track this enrollment to update later
                    if (newSessionMap.containsKey(singleEventSchedule)) {
                        System.debug('newSession before commit--'+singleEventSchedule);
                        newSessionMap.get(singleEventSchedule).add(sessionSpeakerEnrollment);
                        System.debug('sessionmap----'+newSessionMap.get(singleEventSchedule));
                    }
                }
                sessionSpeakerEnrollmentList.add(sessionSpeakerEnrollment);
                if (String.isNotBlank(sessionSpeakerEnrollment?.Id)) {
                    uow.registerDirty(sessionSpeakerEnrollment);
                } else {
                    sessionSpeakerEnrollment.Schedule_Sessions__c = singleEventSchedule.Id;
                    uow.registerNew(sessionSpeakerEnrollment, Events_Sessions_Enrollment__c.Schedule_Sessions__c, singleEventSchedule);
                }
            }
        }
        System.debug('newSessionMap before commit: ' + newSessionMap);
        uow.commitWork();
        System.debug('newSessionMap before commit: ' + newSessionMap);
    }
    
    public class EventScheduleWrapper {
        @AuraEnabled
        public String Id;
        @AuraEnabled
        public String agenda;
        @AuraEnabled
        public Date startDate;
        @AuraEnabled
        public Time startTime;
        @AuraEnabled
        public Time endTime;
        @AuraEnabled
        public Date endDate;
        @AuraEnabled
        public String eventId;
        @AuraEnabled
        public String locationType;
        @AuraEnabled
        public String locationAddress;
        @AuraEnabled
        public String sessionLink;
        @AuraEnabled
        public String name;
        @AuraEnabled
        public String sessionBroucher;
        @AuraEnabled
        public String sessionBroucherBase64;
        @AuraEnabled
        public List<SpeakerWrapper> speakers;
        
        public EventScheduleWrapper() {
            this.speakers = new List<SpeakerWrapper>();
        }
        
        public EventScheduleWrapper(Schedule_Sessions__c eventSchedule) {
            this.Id = eventSchedule?.Id != null?eventSchedule.Id:'';
            this.agenda = eventSchedule.What_to_Expect_From_Event__c;
            this.startTime = eventSchedule.Start_Time__c;
            this.endTime = eventSchedule.End_Time__c;
            this.startDate = eventSchedule.Start_Date__c!=null?eventSchedule.Start_Date__c:null;
            System.debug('time---'+this.startDate);
            this.eventId = eventSchedule.Event_Reference__c;
            this.sessionBroucher = eventSchedule.Session_Broucher__c;
            this.name = eventSchedule.Name;
            this.speakers = new List<SpeakerWrapper>();
            this.locationType = eventSchedule.Location_Type__c;
            this.locationAddress = eventSchedule.Location__c;
            this.sessionLink = eventSchedule.Session_Link__c;
            // If there are speaker child records, map them to the SpeakerWrapper
            if (eventSchedule.Event_Session_Account_Associations__r != null) {
                for (Events_Sessions_Enrollment__c speakerRecord : eventSchedule.Event_Session_Account_Associations__r) {
                    this.speakers.add(new SpeakerWrapper(speakerRecord));
                }
            }
        }
        
        public Schedule_Sessions__c getRecord() {
            
            Schedule_Sessions__c es = new Schedule_Sessions__c();
            if (this.Id != null && this.Id !='')
                es.Id = this.Id;
            if (this.agenda != null && this.agenda !='')
                es.What_to_Expect_From_Event__c = this.agenda;
            if (this.startDate != null)
                es.Start_Date__c = this.startDate;
            if (this.startTime != null)
                es.Start_Time__c = this.startTime;
            if (this.endTime != null)
                es.End_Time__c = this.endTime;
            if (this.eventId != null && this.eventId !=' ')
                es.Event_Reference__c = this.eventId;
            
            if (this.name != null && this.name !='')
                es.Name = this.name;
            
            if (this.locationType != null && this.locationType !='')
                es.Location_Type__c = this.locationType;
            
            if (this.locationAddress != null && this.locationAddress !='')
                es.Location__c = this.locationAddress;
            
            if (this.sessionLink != null && this.sessionLink !='')
                es.Session_Link__c = this.sessionLink;
            if (this.sessionBroucherBase64 != null && this.sessionBroucherBase64 !=''){
                string publicurl = ken42_CreateContentVersion.createContentVersion(this.name, this.sessionBroucherBase64);
                
                es.Session_Broucher__c = publicurl;
                system.debug('publicurl---'+publicurl);
            }
            
            
            return es;
        }
    }
    public class SpeakerWrapper {
        @AuraEnabled
        public String Id { get; set; }
        @AuraEnabled
        public String name { get; set; }       
        @AuraEnabled
        public String description { get; set; }
        
        @AuraEnabled
        public String contactId { get; set; }
        @AuraEnabled
        public String speakerImage { get; set; }
        @AuraEnabled
        public String speakerImageBase64 { get; set; }
        
        // Default Constructor
        public SpeakerWrapper() {}
        
        // Constructor to initialize the name and description from the related record
        public SpeakerWrapper(Events_Sessions_Enrollment__c speakerRecord) {
            this.name = speakerRecord.Contact__c != null ? speakerRecord.Contact__r.Name : '';
            this.description = speakerRecord.Description__c != null ? speakerRecord.Description__c : '';
            this.Id = speakerRecord.Id != null ? speakerRecord.Id : null;
            this.contactId = speakerRecord.Contact__c != null ? speakerRecord.Contact__c : null;
            this.speakerImage = speakerRecord.Speaker_Image__c != null ? speakerRecord.Speaker_Image__c : null;
        }
        public Events_Sessions_Enrollment__c getSessionEnrollmentRecord(){
            Events_Sessions_Enrollment__c speakerRecord = new Events_Sessions_Enrollment__c();
            if (this.description != null && this.description != '') {
                speakerRecord.Description__c = this.description;
            }
            if (this.Id != null && this.Id != '') {
                speakerRecord.Id = this.Id;
            }
            if (this.contactId != null && this.contactId!= '') {
                speakerRecord.Contact__c = this.contactId;
            }
            if (this.speakerImageBase64 != null && this.speakerImageBase64!= '') {
                string publicurl = ken42_CreateContentVersion.createContentVersion('speakerImage.PNG', this.speakerImageBase64);
                speakerRecord.Speaker_Image__c = publicurl;
            }
            return speakerRecord;
        }
    }
    /**********insert Speakers************************/
    @AuraEnabled
    public static void insertSpeaker(String records){
        System.debug('records------'+records);
        List<Events_Sessions_Enrollment__c> requestBody = (List<Events_Sessions_Enrollment__c>) JSON.deserialize(
            records,
            List<Events_Sessions_Enrollment__c>.class
        );
        System.debug('requestBody===='+requestBody);
        upsert requestBody;
    }
    
    /********** Fetch event details***************/
    @AuraEnabled(cacheable=false)
    public static EventWrapper getEvent(String recordId){
        System.debug('eventId----'+recordId);
        Event_Master__c event = [SELECT Id, Name,Event_Current_Step__c,Language__c,Event_Status__c,Target_Keywords__c,Event_Broucher__c,Description__c,createdDate,Event_Fee__c,No_Fee__c, RecordTypeId, End_Date__c, End_Time__c, Event_Group_Id__c, Event_Type__c, Event_banner__c, Evvent_Group__c, Is_Archived__c, Is_Scheduled__c, Is_Active__c, Location__c, Max_Allowed_Participants__c, Start_Date__c, Start_Time__c, Title__c, What_to_Expect_From_Event__c FROM Event_Master__c WHERE Id=:recordId];
        
        EventWrapper eventWrapper = new EventWrapper(event);
        return eventWrapper;
    } 
    @AuraEnabled
    public static void updateEvent(string eventData){
        System.debug('records===='+eventData);
        EventWrapper requestBody = (EventWrapper) JSON.deserialize(
            eventData,
            EventWrapper.class
        );
        Event_Master__c updateEvent = requestBody.getRecord();
        update updateEvent;
    }    
    public class EventWrapper {
        @AuraEnabled
        public String Id { get; set; }
        @AuraEnabled
        public String contentDocumentId { get; set; }
        @AuraEnabled
        public Boolean isEventGroup { get; set; }
        @AuraEnabled
        public String eventTitle { get; set; }
        @AuraEnabled
        public String eventGroupId { get; set; }
        @AuraEnabled
        public String eventGroupTitle { get; set; }
        @AuraEnabled
        public String eventTypes { get; set; }
        @AuraEnabled
        public String description { get; set; }
        @AuraEnabled
        public String agenda { get; set; }
        @AuraEnabled
        public Date startdate { get; set; }
        @AuraEnabled
        public Date enddate { get; set; }
        @AuraEnabled
        public String image { get; set; }
        @AuraEnabled
        public String imageFileName { get; set; }
        @AuraEnabled
        public Decimal maximumNumberOfParticipants { get; set; }
        @AuraEnabled
        public String targetKeywords { get; set; }
        
        public EventWrapper(Event_Master__c event){
            this.Id = event.Id;
            this.eventTitle = event.Name;
            this.eventTypes = event.Event_Type__c;
            this.startdate = event.Start_Date__c;
            this.enddate = event.End_Date__c;
            this.description = event.Description__c;
            this.agenda =event.What_to_Expect_From_Event__c;
            this.targetKeyWords = event.Target_Keywords__c;
            this.maximumNumberOfParticipants = event.Max_Allowed_Participants__c;
            this.image = event.Event_banner__c;
        }
        public Event_Master__c getRecord(){
            Event_Master__c updateEvent = new Event_Master__c();
            updateEvent.Id = this.Id;
            if(this.eventTitle !=null && this.eventTitle !=''){
                updateEvent.Name = this.eventTitle;
            }  
            if(this.eventTypes !=null && this.eventTypes !=''){
                updateEvent.Event_Type__c = this.eventTypes;
            }   
            if(this.startdate !=null){
                updateEvent.Start_Date__c = this.startdate;
            }   
            if(this.enddate !=null){
                updateEvent.End_Date__c = this.enddate;
            }   
            if(this.description !=null && this.description !=''){
                updateEvent.Description__c =  this.description;
            }   
            if(this.agenda !=null && this.agenda !=''){
                updateEvent.What_to_Expect_From_Event__c = this.agenda;
            } 
            if(this.maximumNumberOfParticipants !=null){
                updateEvent.Max_Allowed_Participants__c = this.maximumNumberOfParticipants;
            } 
            if(this.image !=null && this.image !=''){
                updateEvent.Event_banner__c = ken42_CreateContentVersion.createContentVersion(this.eventTitle+'Cover Image', this.image);
            } 
            
            
            
            
            
            return updateEvent;
        }
    }
    /********** Fee Setup******************************/    
    public class feeWrapper{
        @AuraEnabled
        public Decimal sessionFee{ get; set; }
        @AuraEnabled
        public Boolean noFee{ get; set; }  
    }
    @AuraEnabled
    public static void updateFee(Boolean isEventWise, Id eventId, Integer eventFee, Boolean isNoFee, List<Schedule_Sessions__c> sessionsMap) {
        System.debug('eventFee--'+eventFee);
        System.debug('isNoFee---'+isNoFee);
        // If event-wise fee update
        if (isEventWise) {
            
            // Fetch the event record
            Event_Master__c eventRecord = [SELECT Id, Event_Fee__c, No_Fee__c FROM Event_Master__c WHERE Id = :eventId LIMIT 1];
            
            // Set the event-level fee or no-fee values
            eventRecord.Event_Fee__c = eventFee;
            eventRecord.No_Fee__c = isNoFee;
            
            // Update the event record
            update eventRecord;
        }
        else {
            List<Schedule_Sessions__c> sessionsToUpdate = new List<Schedule_Sessions__c>();
            for (Schedule_Sessions__c eachSession: sessionsMap) {
                Schedule_Sessions__c session = new Schedule_Sessions__c(Id=eachSession.Id);
                session.Session_Fee__c = eachSession.Session_Fee__c;
                session.No_Fee__c = eachSession.No_Fee__c;
                sessionsToUpdate.add(session);
            }
            if (!sessionsToUpdate.isEmpty()) {
                update sessionsToUpdate;
            }
        }
    }    
    
    @AuraEnabled(cacheable=true)
    public static List<Contact> searchContacts() {
        return [
            SELECT Id, Name
            FROM Contact
            
        ];
    }
    //GET SESSIONS    
    @AuraEnabled
    public static List<Schedule_Sessions__c> getEventSessions(string eventId) {
        System.debug('eventId--'+eventId);
        
        return  [SELECT Id, Name, 
                 Session_Broucher__c,End_Time__c,
                 Start_Date__c,Location_Type__c,Session_Link__c,
                 Event_Reference__c,Event_Reference__r.Event_Broucher__c,
                 Event_Reference__r.Event_banner__c,Event_Reference__r.Name,
                 Event_Reference__r.Event_Fee__c,Event_Reference__r.No_Fee__c,
                 Event_Reference__r.Event_Type__c, 
                 Event_Reference__r.Start_Date__c,
                 Event_Reference__r.End_Date__c,
                 Event_Reference__r.Max_Allowed_Participants__c,
                 Event_Reference__r.Description__c,
                 Start_Time__c, Session_Fee__c,What_to_Expect_From_Event__c, No_Fee__c, Location__c
                 FROM Schedule_Sessions__c WHERE Event_Reference__c =:eventId ORDER BY Start_Date__c];
    }
    
    @AuraEnabled(cacheable=true)
    public static list<sObject> fetchLookupData(string searchKey , string sObjectApiName) {    
        List < sObject > returnList = new List < sObject > ();
        string sWildCardText = '%' + searchKey + '%';
        String sQuery = 'SELECT Id, Name ' +
            'FROM ' + sObjectApiName + ' ' +
            'WHERE Name LIKE :sWildCardText ' +
            'AND RecordType.DeveloperName = \'Event_Group\' ' +
            'ORDER BY CreatedDate DESC ' +
            'LIMIT 5';
        for (sObject obj: database.query(sQuery)) {
            returnList.add(obj);
        }
        return returnList;
    }
    @AuraEnabled(cacheable=true)
    public static List<String> getPicklistValues() {
        String sObjectName = 'Event_Master__c';
        String fieldName = 'Event_Type__c';
        List<String> picklistValues = new List<String>();
        Schema.SObjectType objType = Schema.getGlobalDescribe().get(sObjectName);
        Schema.DescribeSObjectResult describeObjResult = objType.getDescribe();
        Map<String, Schema.SObjectField> fieldMap = describeObjResult.fields.getMap();
        Schema.DescribeFieldResult fieldResult = fieldMap.get(fieldName).getDescribe();
        
        for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
            picklistValues.add(entry.getLabel());
        }
        return picklistValues;
    }
    @AuraEnabled
    public static String saveData(String eventData) {
        System.debug('Received JSON data: ' + eventData);
        
        EventWrapper wrapper = (EventWrapper) JSON.deserialize(eventData, EventWrapper.class);
        
        System.debug('Wrapper values: ' + JSON.serialize(wrapper));
        
        Id recordTypeId = Schema.SObjectType.Event_Master__c.getRecordTypeInfosByName().get('Event Group').getRecordTypeId();
        
        Event_Master__c record = new Event_Master__c();
        record.Name = (wrapper.eventGroupTitle != null && wrapper.eventGroupTitle != '') ? wrapper.eventGroupTitle : wrapper.eventTitle;
        
        if (wrapper.isEventGroup) {
            record.RecordTypeId = recordTypeId;
        }
        if (wrapper.eventGroupId != null && wrapper.eventGroupId != '') {
            record.Evvent_Group__c = wrapper.eventGroupId;
        }
        if (wrapper.startdate != null) {
            record.Start_Date__c = wrapper.startdate;
        }
        if (wrapper.enddate != null) {
            record.End_Date__c = wrapper.enddate;
        }
        
        record.Event_Type__c = wrapper.eventTypes;
        record.Description__c = wrapper.description;
        record.What_to_Expect_From_Event__c = wrapper.agenda;
        record.Event_banner__c = ken42_CreateContentVersion.createContentVersion('Event Cover Image', wrapper.image);
        insert record;
        
        if (String.isNotEmpty(wrapper.image)) {
            ContentVersion contentVersion = new ContentVersion();
            contentVersion.Title = record.Name + ' Cover Photo';
            contentVersion.PathOnClient = wrapper.imageFileName;
            contentVersion.VersionData = EncodingUtil.base64Decode(wrapper.image);
            insert contentVersion;
            
            ContentVersion cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :contentVersion.Id LIMIT 1];
            
            ContentDocumentLink contentDocumentLink = new ContentDocumentLink();
            contentDocumentLink.ContentDocumentId = cv.ContentDocumentId;
            contentDocumentLink.LinkedEntityId = record.Id;
            contentDocumentLink.ShareType = 'V';
            insert contentDocumentLink;
        }
        
        return record.Id;
    }    
}