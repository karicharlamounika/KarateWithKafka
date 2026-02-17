Feature: Add Item flow with Kafka and DB verification

  Background:
    # API Gateway base URL
    * def baseUrl = baseUrl

    # User login payload
    * def loginPayload = { "email": "#(testUser.email)", "password": "#(testUser.password)"}

    # Item payload
    * def itemPayload = { "name": "Laptop", "quantity": 10}

    # Ensure user exists before login
    * print 'Ensuring test user exists...'
    * call read('classpath:karatehelpers/register-user.feature')

    # Step 0: Start Kafka Consumer BEFORE API calls
    * print 'Starting Kafka consumer...'
    * def topic = { topic: 'items-events' }
    * call read('classpath:karatehelpers/kafka-start.feature') topic

    * karate.log('Kafka consumer initialized')

  Scenario: User adds an item and system updates via Kafka
    # Step 1: Login user
    Given url baseUrl + '/auth/login'
    And request loginPayload
    When method POST
    Then status 200
    # Save token in headers
    * def token = response.token
    * def authHeader = 'Bearer ' + token

    # Step 2: Add Item
    Given url baseUrl + '/items'
    And request itemPayload
    And header Authorization = authHeader
    When method POST
    Then status 202
    And match response.message == 'Item creation queued'

    # Step 3: Validate Kafka Event (consumer was started in Background)
    * def kafkaMessage = call read('classpath:karatehelpers/kafka-wait.feature') { eventType: 'ITEM_CREATED', timeout: 15000 }
    * print 'Received Kafka message:',  kafkaMessage
    Then match kafkaMessage.message.eventType == 'ITEM_CREATED'
    * print 'Kafka message payload:' , kafkaMessage.message.payload.name , ', quantity:' + kafkaMessage.message.payload.quantity
    And match kafkaMessage.message.payload.name == 'Laptop'
    And match kafkaMessage.message.payload.quantity == 10

    # Step 4: Validate DB Update
    * def dbItem = call read('classpath:utils/dbQuery.js') { name: '#(itemPayload.name)' }
    * print 'DB Item:', dbItem
    Then match dbItem.name == 'Laptop'
    And match dbItem.quantity == 10
