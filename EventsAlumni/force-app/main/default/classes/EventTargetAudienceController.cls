public class EventTargetAudienceController {
/*** To Fetch Graduation and program details for Event Target Audience***/
    @AuraEnabled(cacheable=true)
    public static Map<String, List<String>> getProgramGraduationValues() {
        Set<String> yearOfGraduationSet = new Set<String>();
        Set<String> programSet = new Set<String>();

        List<Contact> contacts = [SELECT Id, Year_of_Graduation__c, Program__c FROM Contact];

        for (Contact contactRecord : contacts) {
            if (contactRecord.Year_of_Graduation__c != null) {
                yearOfGraduationSet.add(contactRecord.Year_of_Graduation__c);
            }
            if (contactRecord.Program__c != null) {
                programSet.add(contactRecord.Program__c);
            }
        }

        List<String> yearOfGraduationList = new List<String>(yearOfGraduationSet);
        List<String> programList = new List<String>(programSet);

        Map<String, List<String>> result = new Map<String, List<String>>();
        result.put('Year_of_Graduation', yearOfGraduationList);
        result.put('Program', programList);

        return result;
    }
    
     @AuraEnabled
    public static void saveEventTargetAudience(Event_Target_Audience__c targetAudience) {
        try {
            List<Event_Target_Audience__c> targetAudienceList = new List<Event_Target_Audience__c>();
            System.debug('targetAudience--'+targetAudience);
            if(targetAudience?.Id!=null){
                 update targetAudience;
            }else{
                insert targetAudience;
            }
            
        } catch (DmlException e) {
            throw new AuraHandledException('Error saving Event Target Audience: ' + e.getMessage());
        }
    }
}