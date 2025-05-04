public with sharing class ken42_CreateContentVersion {
    public static String createContentVersion(String title, String base64String) {
        try{
            Blob decodedData = EncodingUtil.base64Decode(base64String);
        // Create a new ContentVersion record
            ContentVersion newVersion = new ContentVersion();
            newVersion.Title = title+'.PNG';
            newVersion.PathOnClient = title+'.PNG';
            newVersion.VersionData = decodedData;
            //newVersion.ContentLocation = 'S'; // S indicates that the content is stored in Salesforce

            insert newVersion;
            system.debug('newVersion'+newVersion.id);
        
            List<ContentVersion> documentId = [SELECT Id, ContentDocumentId, ContentUrl, ContentBodyId, Title, OwnerId, CreatedDate, FileType FROM ContentVersion WHERE Id=:newVersion.Id];
            //Generate public url
            ContentDistribution distribution = new ContentDistribution();
            distribution.Name = title;
            distribution.ContentVersionId  = documentId[0].Id;
            //distribution.PreferencesLinkAccess = 'Public'; 
            distribution.PreferencesLinkLatestVersion = true;
            distribution.PreferencesAllowViewInBrowser = true;
            
            //distribution.PreferencesExpires = true;
            //distribution.PreferencesNotifyOnVisit = false;
            //distribution.PreferencesPasswordRequired = false;
            //distribution.PreferencesAllowOriginalDownload = true;
            //distribution.ExpiryDate = System.now().addDays(30); 
            insert distribution;
            System.debug('distribution.DistributionPublicUrl'+distribution.DistributionPublicUrl+distribution.Id);
                 
            ContentDistribution contentDistribution = [SELECT Id, CreatedDate, OwnerId, ContentVersionId, ContentDocumentId, RelatedRecordId, DistributionPublicUrl, ContentDownloadUrl, PdfDownloadUrl, PreferencesLinkLatestVersion, PreferencesAllowPDFDownload, PreferencesAllowOriginalDownload, PreferencesPasswordRequired FROM ContentDistribution WHERE Id =:distribution.Id LIMIT 1];
             String distributionPublicurl = updatePublicLink(contentDistribution.Id);
             return distributionPublicurl;
            
        }Catch(Exception ex){
            System.debug('Exception occurred: ' + ex.getMessage());
            return ex.getMessage();
        }
   
    }
    
    private static string updatePublicLink(Id contentDistributionId) {
        String baseUrl = URL.getOrgDomainUrl().toExternalForm();
        String orgId = UserInfo.getOrganizationId();
        ContentDistribution cd = [SELECT Id, ContentVersionId, DistributionPublicUrl FROM ContentDistribution WHERE Id =: contentDistributionId];
        ContentVersion cv = [SELECT Id, ContentBodyId, ContentDocument.FileType FROM ContentVersion WHERE Id =: cd.ContentVersionId];
        String URL = baseUrl+'/sfc/dist/version/renditionDownload?rendition=ORIGINAL_'+cv.ContentDocument.FileType+'\u0026versionId='+cv.Id+'\u0026operationContext=DELIVERY&contentId='+
            cv.ContentBodyId+'\u0026page=0\u0026d='+extractLink(cd.DistributionPublicUrl)+'\u0026oid='+orgId+'\u0026dpt=null\u0026viewId=';
        return URL = URL.replaceAll('amp;', '');
       
    }
    
    public static String extractLink(String url) {
        String pattern = '/a/';
        
        Integer startIndex = url.indexOf(pattern);
        
        if (startIndex != -1) {
            String result = url.substring(startIndex);
            return result;
        }
        return null;
    }
    
}