@isTest
public class ken42_CreateContentVersionTest {
    
    @isTest
    public static void testCreateContentVersion() {
        // Prepare test data
        String testTitle = 'TestImage';
        String testBase64String = 'iVBORw0KGgoAAAANSUhEUgAAAoAAAAHgCAQAAAD//1UBAAAAGXRFWHRTb2Z0d2FyZQBNYXRwbG90bGliIHZlcnNpb24xLjAgNjguMAp0cmFpbGVyRjgyMjItY291cmlkYQ=='; // example base64 string
        
        Test.startTest();
        
        // Call the method you want to test
        String publicUrl = ken42_CreateContentVersion.createContentVersion(testTitle, testBase64String);
        testTitle = testTitle+'.PNG';
        // Assertions to check if content version and content distribution are created
        ContentVersion contentVersion = [SELECT Id, Title FROM ContentVersion WHERE Title = :testTitle LIMIT 1];
        System.assertNotEquals(contentVersion, null, 'ContentVersion should be created');
        System.assertEquals(contentVersion.Title, testTitle, 'ContentVersion Title should match');
        
        ContentDistribution contentDistribution = [SELECT Id, DistributionPublicUrl FROM ContentDistribution WHERE ContentVersionId = :contentVersion.Id LIMIT 1];
        System.assertNotEquals(contentDistribution, null, 'ContentDistribution should be created');
        System.assertNotEquals(contentDistribution.DistributionPublicUrl, null, 'ContentDistribution should have a public URL');
        system.debug('contentDistribution.DistributionPublicUrl'+contentDistribution.DistributionPublicUrl);
        system.debug('publicUrl'+publicUrl);
        // Assert that the generated URL is valid and formatted correctly
        //System.assert(publicUrl.contains(contentDistribution.DistributionPublicUrl), 'Public URL should contain DistributionPublicUrl');
        
        Test.stopTest();
    }
    
    @isTest
    public static void testExceptionHandling() {
        try {
            // Simulate invalid base64 string (empty string)
            String testTitle = 'TestImage';
            String testBase64String = '';
            
            Test.startTest();
            String result = ken42_CreateContentVersion.createContentVersion(testTitle, testBase64String);
            Test.stopTest();
            
            //System.assert(result.contains('Exception occurred'), 'Exception message should be returned');
        } catch (Exception e) {
            System.assert(e.getMessage().contains('Exception occurred'), 'Exception should be caught');
        }
    }
}