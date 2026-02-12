@Ignore
Feature: Register test user if needed

  Background:
    * def baseUrl = karate.config.baseUrl

  Scenario: Register the test user
    * def registerPayload =
    """
    {
      "firstName": "#(karate.config.testUser.firstName)",
      "lastName": "#(karate.config.testUser.lastName)",
      "email": "#(karate.config.testUser.email)",
      "password": "#(karate.config.testUser.password)"
    }
    """
    Given url baseUrl + '/auth/register'
    And request registerPayload
    When method POST
    * def statusCode = responseStatus
    * match statusCode == 201 || statusCode == 409
