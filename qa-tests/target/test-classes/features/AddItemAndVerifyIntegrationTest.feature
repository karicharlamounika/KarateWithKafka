Feature: Add Item flow with Kafka and DB verification

  Background:
    # API Gateway base URL
    * def baseUrl = baseUrl

    # User login payload
    * def loginPayload =
      """
      {
        "email": "#(testUser.email)",
        "password": "#(testUser.password)"
      }
      """

    # Item payload
    * def itemPayload =
      """
      {
        "name": "Laptop",
        "quantity": 10
      }
      """

    # Headers container
    * def authHeaders = {}

    # Ensure user exists before login
    * print 'Ensuring test user exists...'
    * call read('classpath:karatehelpers/register-user.feature')

    # Step 0: Start Kafka Consumer BEFORE API calls
    * print 'Starting Kafka consumer...'
    * call read('classpath:karatehelpers/kafka-start.feature')
      """
      { topic: 'items-events' }
      """
    * karate.log('Kafka consumer initialized')

  Scenario: User adds an item and system updates via Kafka
    # Step 1: Login user
    Given url baseUrl + '/auth/login'
    And request loginPayload
    When method POST
    Then status 200
    # Save token in headers
    * def token = response.token
    * set authHeaders['Authorization'] = 'Bearer ' + token

    # Step 2: Add Item
    Given url baseUrl + '/items'
    And request itemPayload
    And headers authHeaders
    When method POST
    Then status 202
    And match response.message == 'Item creation queued'

    # Fetch latest created item id from read model
    * def dbLatest = call read('classpath:utils/dbQuery.js')
      """
      { latest: true }
      """
    * def itemId = dbLatest.id

    # Step 3: Validate Kafka Event (consumer was started in Background)
    * def kafkaMessage = call read('classpath:karatehelpers/kafka-wait.feature')
      """
      { eventType: 'ITEM_CREATED', timeout: 15000 }
      """
    Then match kafkaMessage.eventType == 'ITEM_CREATED'
    And match kafkaMessage.payload.name == 'Laptop'
    And match kafkaMessage.payload.quantity == 10

    # Step 4: Validate DB Update
    * def dbItem = call read('classpath:utils/dbQuery.js')
      """
      { id: '#(itemId)' }
      """
    Then match dbItem.name == 'Laptop'
    And match dbItem.quantity == 10
