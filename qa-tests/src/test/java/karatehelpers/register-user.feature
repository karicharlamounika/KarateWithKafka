@Ignore
Feature: Register test user if needed

  Background:

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
    Given url baseUrl + '/auth/register'
    And request registerPayload
    When method POST
    * def statusCode = responseStatus
    * match statusCode == 201 || statusCode == 409
