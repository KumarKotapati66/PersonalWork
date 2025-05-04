public with sharing class InfiniteLoadingController {
    @AuraEnabled(cacheable=true)
    public static List<Account> loadById(){
        try {
            return[SELECT Id, Name, Industry,Rating FROM Account Order By Name,Id Limit 10];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
   @AuraEnabled
   public static List<Account> loadMoreData(String lastName, String lastId){
    try {
         return [SELECT Id, Name, Industry,Rating FROM Account WHERE (Name>:lastName) OR (Name=:lastName AND Id >: lastId) Order By Name,Id Limit 10];
    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
   }
   @AuraEnabled
   public static Integer totalRecords(){
    try {
          AggregateResult agr = [SELECT COUNT(Id) total FROM Account];
          return (Integer) agr.get('total');
    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
   }
}