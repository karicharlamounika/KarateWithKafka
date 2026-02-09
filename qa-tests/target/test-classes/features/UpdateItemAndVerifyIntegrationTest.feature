Feature: Update Item flow with Kafka and DB verification

  Background:
    # Base URL via API Gateway
    * def baseUrl = karate.properties['baseUrl'] || 'http://localhost:8080'

    # Login payload
    * def loginPayload =
    """
    {
      "email": "testuser@example.com",
      "password": "Password123"
    }
    """

    # Initial item payload (setup)
    * def createItemPayload =
    """
    {
      "name": "Monitor",
      "quantity": 5
    }
    """

    # Updated item payload
    * def updateItemPayload =
    """
    {
      "name": "Monitor-HD",
      "quantity": 10
    }
    """

    * def authHeaders = {}

  Scenario: User updates an item and system propagates changes via Kafka

    # Step 1: Login
    Given url baseUrl + '/auth/login'
    And request loginPayload
    When method POST
    Then status 200
    * def token = response.token
    * set authHeaders['Authorization'] = 'Bearer ' + token

    # Step 2: Create Item (prerequisite)
    Given url baseUrl + '/items'
    And headers authHeaders
    And request createItemPayload
    When method POST
    Then status 201
    * def itemId = response.id

    # Step 3: Start Kafka consumer BEFORE update
    * print 'Starting Kafka consumer for UPDATE event'
    * def updateEvent =
      call read('classpath:utils/kafkaConsumer.js')
      { topic: 'item-events', itemId: itemId, timeout: 15000 }

    # Step 4: Update Item
    Given url baseUrl + '/items/' + itemId
    And headers authHeaders
    And request updateItemPayload
    When method PUT
    Then status 200
    And match response.name == 'Monitor-HD'
    And match response.quantity == 10

    # Step 5: Validate Kafka UPDATE event
    Then match updateEvent.eventType == 'ITEM_UPDATED'
    And match updateEvent.data.id == itemId
    And match updateEvent.data.name == 'Monitor-HD'
    And match updateEvent.data.quantity == 10

    # Step 6: Validate DB state (read model)
    * def dbItem =
      call read('classpath:utils/dbQuery.js') { id: itemId }

    Then match dbItem.name == 'Monitor-HD'
    And match dbItem.quantity == 10
