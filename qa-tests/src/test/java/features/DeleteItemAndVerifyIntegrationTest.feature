Feature: Delete Item flow with Kafka and DB verification

  Background:
    # API Gateway base URL
    * def baseUrl = karate.config.baseUrl

    # Kafka configuration
    * def kafkaBootstrap = karate.config.kafka.bootstrap
    * call read('classpath:helpers/kafka-start.feature')
      """
      { topic: 'items-events' }
      """

    # Login payload
    * def loginPayload =
      """
      {
        "email": "#(karate.config.testUser.email)",
        "password": "#(karate.config.testUser.password)"
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

    # Ensure user exists before login
    * call read('classpath:karatehelpers/register-user.feature')

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

    # Step 3: Delete Item
    Given url baseUrl + '/items/' + itemId
    And headers authHeaders
    When method DELETE
    Then status 204

    # Step 4: Validate Kafka DELETE event
    * def deleteEvent = call read('classpath:karatehelpers/kafka-wait.feature')
      """
      { itemId: '#(itemId)', eventType: 'ITEM_DELETED', timeout: 15000 }
      """
    Then match deleteEvent.eventType == 'ITEM_DELETED'
    And match deleteEvent.data.id == itemId

    # Step 5: Validate DB state (item should NOT exist)
    * def dbItem = call read('classpath:utils/dbQuery.js')
      """
      { id: '#(itemId)' }
      """
    Then match dbItem == null
