public without sharing class DailyMenuController {

    @AuraEnabled(cacheable=true)
    public static List<Menu_Order__c> getDailyMenu(String messId, String selectedDate) {
        try {
            // Validate inputs
            if (String.isBlank(messId) || String.isBlank(selectedDate)) {
                throw new AuraHandledException('Mess ID and Date are required.');
            }
            
            // Parse date
            Date menuDate = Date.valueOf(selectedDate);

            System.debug('menuDate is ::' + menuDate);
            //System.debug('menuDate typeof:::' +  menuDate instanceof Date);
            System.debug('messId is ::' + messId);
            
            // Query menu items
            return [
                SELECT 
                    Id, Name, Day__c, Type__c,Menu_Id__r.Approval_Status__c, Date__c, Start_Time__c, End_Time__c, 
                    Menu_Id__r.Name, Mess__r.Name, Item__c, Category__c, 
                    CreatedDate, LastModifiedDate
                FROM Menu_Order__c 
                WHERE RecordType.Name = 'Daily Menu' 
                AND Mess__c = :messId 
                AND Date__c = :menuDate
                AND Menu_Id__r.Approval_Status__c = 'Approved'
                ORDER BY Type__c, Name
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving menu data: ' + e.getMessage());
        }
    }
    
    /**
     * Retrieves menu item details by item names
     * @param itemNames List of item names to look up
     * @return List of Menu_Item__c records
     */
    @AuraEnabled(cacheable=true)
    public static List<Menu_Item__c> getMenuItemDetails(List<String> itemNames) {
        try {
            // Validate input
            if (itemNames == null || itemNames.isEmpty()) {
                return new List<Menu_Item__c>();
            }
            
            // Query menu item details
            return [
                SELECT 
                    Id, Name, Calories_kcal__c, Carbs__c, Category__c, 
                    Cholesterol__c, Cuisine__c, Fat__c, Fibre__c, 
                    Sugar__c, Protein__c,Meal_Type__c
                FROM Menu_Item__c
                WHERE Name IN :itemNames
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving menu item details: ' + e.getMessage());
        }
    }
    
}