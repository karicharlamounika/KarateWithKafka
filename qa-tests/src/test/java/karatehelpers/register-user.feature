@Ignore
Feature: Register test user if needed

  Background:
    * def baseUrl = config.baseUrl

  Scenario: Register the test user
    * def registerPayload =
    """
    {
      "firstName": "#(config.testUser.firstName)",
      "lastName": "#(config.testUser.lastName)",
      "email": "#(config.testUser.email)",
      "password": "#(config.testUser.password)"
    }
    """
    Given url baseUrl + '/auth/register'
    And request registerPayload
    When method POST
    * def statusCode = responseStatus
    * match statusCode == 201 || statusCode == 409
