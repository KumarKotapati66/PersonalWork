public without sharing class MessMenuControllerForStudent {
    @AuraEnabled(cacheable=true)
    public static List<Menu_Order__c> getMessSchedule(String messId) {
        return [SELECT Id, Name, RecordTypeId, Start_Time__c, End_Time__c, Day__c, Type__c 
                FROM Menu_Order__c 
                WHERE RecordType.Name = 'Template' 
                AND Mess__c  = :messId];
    }
    @AuraEnabled(cacheable=true)
    public static List<Menu_Order__c> getDailyMenuItemsStudentPortal(String messId, Date startDate, Date endDate,Long refreshToken) {
        // Query for daily menu records within date range
        return [SELECT Id, Name, Day__c,Menu_Id__r.Approval_Status__c, Date__c, Type__c, Category__c, Item__c, Start_Time__c, End_Time__c, Mess__c
                FROM Menu_Order__c
                WHERE RecordType.Name = 'Daily Menu'
                AND Mess__c = :messId
                AND Date__c >= :startDate
                AND Date__c <= :endDate
                AND Menu_Id__r.Approval_Status__c = 'Approved'
                ORDER BY Date__c, Type__c, Category__c];
    } 
    
}