/**
* @description       : 
* @author            : ChangeMeIn@UserSettingsUnder.SFDoc
* @group             : 
* @last modified on  : 04-02-2024
* @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public with sharing class RestApiUtility {
    public static final Integer HTTP_SUCCESS = 200;
    public static final Integer HTTP_BAD_REQUEST = 400;
    public static final Integer HTTP_NOT_FOUND = 404;
    public static final String ERROR_URL_INVALID = 'The request URL is invalid.';
    public static final String HTTP = 'HTTP';
    
    public RestApiUtility() {
    }
    
    public static void addError(Integer statusCode, String errorMessage) {
        ApiResponse result = new ApiResponse();
        result.success = false;
        result.errorMessage = errorMessage;
        
        RestContext.response.statusCode = statusCode;
        RestContext.response.headers.put('content-type', 'text/plain');
        RestContext.response.responseBody = Blob.valueOf(JSON.serialize(result));
    }
    
    /*public static void createSuccessGetResponse(Object responseWrapper) {
        ApiGetResponse result = new ApiGetResponse();
        result.success = true;
        result.data = responseWrapper;
        
        RestContext.response.addHeader('Content-Type', 'application/json');
        RestContext.response.statusCode = HTTP_SUCCESS;
        RestContext.response.responseBody = Blob.valueOf(Json.serialize(result));
    }*/
    
    public static void createSuccessPostResponse(Object responseWrapper) {
        ApiPostResponse result = new ApiPostResponse();
        result.success = true;
        if (responseWrapper != null) {
            result.data = responseWrapper;
        }
        
        //RestResponse res = new RestResponse();
        //RestContext.response = res;
        
        RestContext.response.addHeader('Content-Type', 'application/json');
        RestContext.response.statusCode = HTTP_SUCCESS;
        RestContext.response.responseBody = Blob.valueOf(JSON.serialize(result));
    }
    
    public virtual class ApiResponse {
        public Boolean success;
        public String errorMessage;
    }
    
    public class ApiGetResponse extends ApiResponse {
        public Object data;
    }
    
    public class ApiPostResponse extends ApiResponse {
        public Object data;
    }
    
    public class ErrorBody {
        public String targetObject;
        public String targetField;
        public String errorMessage;
        
        public ErrorBody(String targetObject, String targetField, String errorMessage) {
            this.targetObject = targetObject;
            this.targetField = targetField;
            this.errorMessage = errorMessage;
        }
    }
}