Feature: Delete Item flow with Kafka and DB verification

  Background:
    # Base URL (API Gateway)
    * def baseUrl = karate.properties['baseUrl'] || 'http://localhost:8080'

    # Login payload
    * def loginPayload =
    """
    {
      "email": "testuser@example.com",
      "password": "Password123"
    }
    """

    # Item payload for setup
    * def itemPayload =
    """
    {
      "name": "Keyboard",
      "quantity": 5
    }
    """

    * def authHeaders = {}

  Scenario: User deletes an item and system propagates changes via Kafka

    # Step 1: Login
    Given url baseUrl + '/auth/login'
    And request loginPayload
    When method POST
    Then status 200
    * def token = response.token
    * set authHeaders['Authorization'] = 'Bearer ' + token

    # Step 2: Add Item (setup prerequisite)
    Given url baseUrl + '/items'
    And headers authHeaders
    And request itemPayload
    When method POST
    Then status 201
    * def itemId = response.id

    # Step 3: Start Kafka consumer BEFORE delete
    * print 'Starting Kafka consumer for DELETE event'
    * def deleteEvent =
      call read('classpath:utils/kafkaConsumer.js')
      { topic: 'item-events', itemId: itemId, timeout: 15000 }

    # Step 4: Delete Item
    Given url baseUrl + '/items/' + itemId
    And headers authHeaders
    When method DELETE
    Then status 204

    # Step 5: Validate Kafka DELETE event
    Then match deleteEvent.eventType == 'ITEM_DELETED'
    And match deleteEvent.data.id == itemId

    # Step 6: Validate DB state (item should NOT exist)
    * def dbItem =
      call read('classpath:utils/dbQuery.js') { id: itemId }

    Then match dbItem == null