public with sharing class TaskController {
    @AuraEnabled(cacheable=true)
    public static List<Task> getTaskData(String userId) {
        try{

            List<Task> taskList = [SELECT Id, Subject, Status, OwnerId FROM Task WHERE OwnerId = :userId WITH SECURITY_ENFORCED];
            if(taskList.isEmpty()){
                throw new AuraHandledException('No Task Found..');
            }
            return taskList;
        }catch(Exception ex){
            throw new AuraHandledException('Failed to Fetch Task List.');
        }
    }
    @AuraEnabled
    public static void updateTask(List<Task> taskList){
        try {
            System.debug('TaskList--'+taskList);
            if(!taskList.isEmpty()){
                for(Task taskRec:taskList){
                    taskRec.Status='Completed';
                }
                update taskList;
            }
        
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    @AuraEnabled
    public static void createTask(String subject, String status) {
        Task newTask = new Task(Subject = subject, Status = status);
         insert newTask;
    }
}