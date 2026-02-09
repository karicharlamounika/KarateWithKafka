Feature: Add Item flow with Kafka and DB verification

Background:
  # API Gateway base URL
  * def baseUrl = karate.config.baseUrl

  # Kafka configuration
  * def kafkaBootstrap = karate.config.kafka.bootstrap
  

    # User login payload
    * def loginPayload =
    """
    {
      "email": "testuser@example.com",
      "password": "Password123"
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

    # Step 0: Start Kafka Consumer BEFORE API calls
    # Assuming kafkaConsumer.js has a startConsumer() function that returns a promise
    * print 'Starting Kafka consumer...'
    * def kafkaConsumerPromise = call read('classpath:java/utils/KafkaTestHelper.java') { topic: 'item-events' }
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
    Then status 201
    And match response.name == 'Laptop'
    And match response.quantity == 10
    * def itemId = response.id

    # Step 3: Validate Kafka Event (consumer was started in Background)
    * def kafkaMessage = call read('classpath:java/utils/KafkaTestHelper.java') { topic: 'item-events', itemId: itemId }
    Then match kafkaMessage.eventType == 'ITEM_ADDED'
    And match kafkaMessage.data.id == itemId
    And match kafkaMessage.data.name == 'Laptop'
    And match kafkaMessage.data.quantity == 10

    # Step 4: Validate DB Update
    * def dbItem = call read('classpath:java/utils/dbQuery.js') { id: itemId }
    Then match dbItem.name == 'Laptop'
    And match dbItem.quantity == 10