public  with sharing class CustomLookupLwcController {
    @AuraEnabled(cacheable=true)
    public static list<sObject> fetchLookupData(string searchKey , string sObjectApiName, String recordTypeName) {    
        List < sObject > returnList = new List < sObject > ();
        string sWildCardText = '%' + searchKey + '%';
        String sQuery = '';
        if (sObjectApiName == 'Event_Master__c' && recordTypeName != null && recordTypeName != '') {
            sQuery = 'SELECT Id, Name ' +
                'FROM ' + sObjectApiName + ' ' +
                'WHERE Name LIKE :sWildCardText ' +
                'AND RecordType.DeveloperName = \'' + recordTypeName + '\'' +
                ' ORDER BY CreatedDate DESC ' +
                'LIMIT 5';
        } else {
            sQuery = 'SELECT Id, Name ' +
                'FROM ' + sObjectApiName + ' ' +
                'WHERE Name LIKE :sWildCardText ' +
                'ORDER BY CreatedDate DESC ' +
                'LIMIT 5';
        }
        
        for (sObject obj: database.query(sQuery)) {
            returnList.add(obj);
        }
        return returnList;
    }
}