@Ignore
Feature: Register test user if needed and return auth token for API tests

  Background:
    * def baseUrl = baseUrl

  Scenario: Register the test user
    * def registerPayload =
      """
      {
        "firstName": "#(testUser.firstName)",
        "lastName": "#(testUser.lastName)",
        "email": "#(testUser.email)",
        "password": "#(testUser.password)"
      }
      """
    # User login payload
    * def loginPayload = { "email": "#(testUser.email)", "password": "#(testUser.password)"}  
    
    Given url baseUrl + '/auth/register'
    And request registerPayload
    When method POST
    * def statusCode = responseStatus
    * assert statusCode == 201 || statusCode == 409

    # Step 2: Login user
    Given url baseUrl + '/auth/login'
    And request loginPayload
    When method POST
    Then status 200
    # Save token in headers
    * def token = response.token
    * def authHeader = 'Bearer ' + token
