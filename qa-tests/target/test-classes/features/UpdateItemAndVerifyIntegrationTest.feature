Feature: Update Item flow with Kafka and DB verification

  Background:
    # Base URL via API Gateway
    * def baseUrl = baseUrl

    # Login payload
    * def loginPayload =
      """
      {
        "email": "#(testUser.email)",
        "password": "#(testUser.password)"
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
    * call read('classpath:karatehelpers/kafka-start.feature') 
      """
      { topic: 'items-events' }
      """
    # Ensure user exists before login
    * call read('classpath:karatehelpers/register-user.feature')

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
    Then status 202
    And match response.message == 'Item creation queued'
    * def dbLatest = call read('classpath:utils/dbQuery.js')
      """
      { latest: true }
      """
    * def itemId = dbLatest.id

    # Step 3: Update Item
    Given url baseUrl + '/items/' + itemId
    And headers authHeaders
    And request updateItemPayload
    When method PUT
    Then status 202
    And match response.message == 'Item update queued'

    # Step 4: Validate Kafka UPDATE event
    * def updateEvent = call read('classpath:karatehelpers/kafka-wait.feature')
      """
      { itemId: '#(itemId)', eventType: 'ITEM_UPDATED', timeout: 15000 }
      """
    Then match updateEvent.eventType == 'ITEM_UPDATED'
    And match updateEvent.payload.id == itemId
    And match updateEvent.payload.name == 'Monitor-HD'
    And match updateEvent.payload.quantity == 10

    # Step 5: Validate DB state (read model)
    * def dbItem = call read('classpath:utils/dbQuery.js')
      """
      { id: '#(itemId)' }
      """
    Then match dbItem.name == 'Monitor-HD'
    And match dbItem.quantity == 10
