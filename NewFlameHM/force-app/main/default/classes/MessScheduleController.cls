public with sharing class MessScheduleController {
    @AuraEnabled
    public static void saveMessSchedule(List<Map<String, Object>> scheduleData, String messId) {
        
        Map<String, Menu_Order__c> keyToNewRecordMap = new Map<String, Menu_Order__c>();
        
        try {
            // Get the ID of the "Template" record type
            Id templateRecordTypeId = Schema.SObjectType.Menu_Order__c.getRecordTypeInfosByName()
                .get('Template').getRecordTypeId();
            
            // Create the new records and build a key for each one
            for (Map<String, Object> meal : scheduleData) {
                Menu_Order__c record = new Menu_Order__c();
                record.Name = (String)meal.get('mealName');
                record.Day__c = (String)meal.get('day');
                record.Mess__c = messId;
                record.Name_Of_The_Meal__c = (String)meal.get('mealName');
                record.Start_Time__c = parseTime((String)meal.get('startTime'));
                record.End_Time__c = parseTime((String)meal.get('endTime'));
                record.RecordTypeId = templateRecordTypeId;
                record.Type__c = (String)meal.get('mealType');
                
                // Create a unique key for each record based on our criteria
                String key = record.Day__c + '_' + record.Type__c + '_' + record.Mess__c;
                keyToNewRecordMap.put(key, record);
            }
            
            // Query for existing records that match our criteria
            List<Menu_Order__c> existingRecords = [
                SELECT Id, Day__c, Type__c, Mess__c 
                FROM Menu_Order__c 
                WHERE Mess__c = :messId 
                AND RecordTypeId = :templateRecordTypeId
                AND Day__c IN :getUniqueDays(scheduleData)
                AND Type__c IN :getUniqueTypes(scheduleData)
            ];
            
            // Records to delete
            List<Menu_Order__c> recordsToDelete = new List<Menu_Order__c>();
            
            // Check each existing record for duplicates
            for (Menu_Order__c existingRecord : existingRecords) {
                String key = existingRecord.Day__c + '_' + existingRecord.Type__c + '_' + existingRecord.Mess__c;
                if (keyToNewRecordMap.containsKey(key)) {
                    recordsToDelete.add(existingRecord);
                }
            }
            
            // Delete existing duplicates if any
            if (!recordsToDelete.isEmpty()) {
                delete recordsToDelete;
            }
            
            // Insert new records
            if (!keyToNewRecordMap.isEmpty()) {
                insert as USER keyToNewRecordMap.values();
            }
        } catch(Exception e) {
            System.debug('Error occurred while saving Mess Schedule: ' + e);
            throw new AuraHandledException(e.getMessage());
        }
    }


    public static Time parseTime(String timeString) {
        if (timeString == null) {
            return null;
        }
         String hours='';
        String period ='';
      /* if(timeString.contains('AM') || timeString.contains('PM')){
            List<String> timeParts = timeString.split(':');
            hours = timeParts[0];
            period = timeParts[1];
       }*/
        
       
        //hours!=''?hours.split(':'):timeString.split(':');
        List<String> hm = timeString.split(':');
        Integer hour = Integer.valueOf(hm[0]);
        Integer minute = Integer.valueOf(hm[1]);

        /*if (period == 'PM' && hour != 12) {
            hour += 12;
        } else if (period == 'AM' && hour == 12) {
            hour = 0;
        }*/

        return Time.newInstance(hour, minute, 0, 0);
    }


    // Helper method to get unique days from schedule data
    private static Set<String> getUniqueDays(List<Map<String, Object>> scheduleData) {
        Set<String> days = new Set<String>();
        for (Map<String, Object> meal : scheduleData) {
            days.add((String)meal.get('day'));
        }
        return days;
}   

    // Helper method to get unique meal types from schedule data
    private static Set<String> getUniqueTypes(List<Map<String, Object>> scheduleData) {
        Set<String> types = new Set<String>();
        for (Map<String, Object> meal : scheduleData) {
            types.add((String)meal.get('mealType'));
        }
        return types;
    }
}