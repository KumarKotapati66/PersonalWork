public class EventTargetAudienceHandler {
    public static void targetAudience(List<Event_Target_Audience__c> newList){
        Map<Id, Map<String,String>> eventIdVsTargetAudience = new Map<Id, Map<String,String>>();
        Map<Id,Event_Master__c> eventIdvsRecord = new Map<Id,Event_Master__c>();
        List<String> emailList = new List<string>();
        List<EmailMessageWrapper> emailsToSend = new List<EmailMessageWrapper>();
        for(Event_Target_Audience__c ETA: newList){
            if(ETA?.Invite_All__c){
                eventIdVsTargetAudience.put(ETA.Event_Master__c, new Map<String,String>());
                eventIdVsTargetAudience.get(ETA.Event_Master__c).put('InviteAll', 'true');
            }
        }
        for(Event_Master__c event:[Select Id, Name FROM Event_Master__c WHERE Id IN:eventIdVsTargetAudience.keySet()]){
            eventIdvsRecord.put(event.Id,event);
        }
        for(Contact contact:[Select id,Email,Event_Reminder_Email_Id__c FROM Contact]){
            if(contact.Event_Reminder_Email_Id__c!=null){
                emailList.add(contact.Event_Reminder_Email_Id__c);
            }
        }
        Integer batchSize = 90;
        for(Id eventId:eventIdvsRecord.keySet()){
            if(emailList.size() > 100){
                 List<List<String>> chunks = chunkStringList(emailList,batchSize);
                for (List<String> emailChunks:chunks) {
                EmailMessageWrapper email = new EmailMessageWrapper(
                    emailChunks,
                   'Batch Process',
                   'Hi New Event '+eventIdvsRecord.get(eventId).Name+' has been created and we would like to invite you!');
                 emailsToSend.add(email);
                }
               }  
            else{
                EmailMessageWrapper email = new EmailMessageWrapper(
                   emailList,
                    'Batch Process',
                   'Hi New Event '+eventIdvsRecord.get(eventId).Name+' has been created and we would like to invite you!');
                    emailsToSend.add(email);
               }
            }
        if(!emailsToSend.isEmpty()){
            Database.executeBatch(new EventBatchProcess(JSON.serialize(emailsToSend)), 100);
        }
    }
    
    public class EmailMessageWrapper {
    public List<String> toAddresses;
    public String subject;
    public String plainTextBody;
    
    // Constructor
    public EmailMessageWrapper(List<String> toAddresses, String subject, String plainTextBody) {
        this.toAddresses = toAddresses;
        this.subject = subject;
        this.plainTextBody = plainTextBody;
    }
}
    public static List<List<String>> chunkStringList(List<String> inputList, Integer chunkSize) {
    List<List<String>> chunks = new List<List<String>>();
    
    for (Integer i = 0; i < inputList.size(); i += chunkSize) {
        // Create a new chunk list
        List<String> chunk = new List<String>();
        
        // Add elements to the chunk
        for (Integer j = i; j < Math.min(i + chunkSize, inputList.size()); j++) {
            chunk.add(inputList[j]);
        }
        
        // Add the chunk to the list of chunks
        chunks.add(chunk);
    }
    
    return chunks;
}

}