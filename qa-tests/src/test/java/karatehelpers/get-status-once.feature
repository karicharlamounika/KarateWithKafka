@Ignore
Feature: Get job status once
    Background:
        * def baseUrl = baseUrl
        * def correlationId = karate.get('correlationId')
        * def authHeader = karate.get('authHeader')

  Scenario: Get status
    Given url baseUrl + '/items/' + correlationId + '/status'
    And header Authorization = authHeader
    When method GET
    Then status 200