@Ignore
Feature: Poll job status until COMPLETED

  Scenario: Poll status endpoint
    * def maxRetries = 10
    * def retryDelay = 2000
    
    * def pollStatus =
      """
      function() {
        for (var i = 0; i < maxRetries; i++) {
          var result = karate.call('classpath:karatehelpers/get-status-once.feature', { correlationId: correlationId, authHeader: authHeader });
          var status = result.response.status;
          karate.log('Poll attempt ' + (i+1) + ' status: ' + status);
          switch(status) {
            case 'COMPLETED':
            karate.log('Job completed successfully');
              return result.response;
            case 'PROCESSING':
            case 'PENDING':
              karate.log('Job is ' + status + ', waiting...');
              break;
            case 'FAILED':
              karate.fail('Job failed: ' + result.response.error.message);
              break;
            default:
              karate.log('Unknown status: ' + status);
          }
          java.lang.Thread.sleep(retryDelay);
        }
        karate.fail('Item never reached COMPLETED status after ' + maxRetries + ' attempts');
      }
      """
    * def finalStatus = call pollStatus