trigger EventTargetAudience on Event_Target_Audience__c (after insert) {
if (Trigger.isAfter && Trigger.isInsert) {
        List<Id> newRecordIds = new List<Id>();
        for (Event_Target_Audience__c ETA : Trigger.new) {
            newRecordIds.add(ETA.Id);
        }
		EventTargetAudienceHandler.targetAudience(Trigger.new);
        //Database.executeBatch(new EventBatchProcess(newRecordIds), 100);
    }
}