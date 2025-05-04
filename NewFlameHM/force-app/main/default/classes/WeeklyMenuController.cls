/**
 * Controller for Weekly Menu LWC Component
 * Provides methods to fetch menu data based on mess ID and date range
 */
public without sharing class WeeklyMenuController {
    
    /**
     * Get weekly menu data for a specific mess and date range
     * @param messId - ID of the mess
     * @param startDate - Start date of the week (YYYY-MM-DD)
     * @return List<Menu_Order__c> - List of menu order records
     */
    @AuraEnabled(cacheable=true)
    public static List<Menu_Order__c> getWeeklyMenu(String messId, String startDate) {
        try {
            // Parse the start date
            Date weekStart = Date.valueOf(startDate);
            
            // Calculate the end date (add 6 days to include the full week)
            Date weekEnd = weekStart.addDays(6);
            
            System.debug('Date range: ' + weekStart + ' to ' + weekEnd);
            System.debug('mess id::' + messId);
            
            // Query for the menu items
            List<Menu_Order__c> menuItems = [
                SELECT 
                    Id, 
                    Name, 
                    Day__c,
                    Type__c,
                    Date__c,
                    Start_Time__c,
                    End_Time__c, 
                    Menu_Id__r.Name, 
                    Mess__r.Name,
                    Item__c,
                    Category__c,
                    CreatedDate,
                    LastModifiedDate 
                FROM 
                    Menu_Order__c 
                WHERE 
                    RecordType.Name = 'Daily Menu' 
                    AND Mess__c = :messId
                    AND Date__c >= :weekStart
                    AND Date__c <= :weekEnd
                ORDER BY 
                    Date__c ASC, 
                    Type__c ASC, 
                    Category__c ASC
            ];

            System.debug('menuItems size:::' + menuItems.size());
            
            return menuItems;
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving menu data: ' + e.getMessage());
        }
    }
}