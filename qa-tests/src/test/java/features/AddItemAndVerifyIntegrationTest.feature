@integration
Feature: Add Item flow with Kafka and DB verification

  Background:
    # API Gateway base URL
    * def baseUrl = baseUrl
    * def authHeader = authHeader

    * def itemName = 'Item_' + java.lang.System.currentTimeMillis()
    * def itemQuantity = Math.floor(Math.random() * 100) + 1
    # Item payload
    * def itemPayload = { "name": "#(itemName)", "quantity": "#(itemQuantity)" }

    # Step 0: Start Kafka Consumer BEFORE API calls
    * print 'Starting Kafka consumer...'
    * def topic = { topic: 'items-events' }
    * call read('classpath:karatehelpers/kafka-start.feature') topic

  Scenario: User adds an item and system updates via Kafka
    # Step 2: Add Item
    Given url baseUrl + '/items'
    And request itemPayload
    And header Authorization = authHeader
    When method POST
    Then status 202
    And match response.message == 'Item creation queued'
    And match response.item.name == itemName
    And match response.item.quantity == itemQuantity
    And match response.item.status == 'PENDING'
    And match response.correlationId == '#string'
    And match response.statusUrl == '#string'

    * def correlationId = (response.correlationId).trim()
    * karate.log('Received correlationId:', correlationId)
    * def statusUrl = response.statusUrl
    * karate.log('Received statusUrl:', statusUrl)
    * def itemId = (response.item.itemId).trim()
    * karate.log('Received itemId:', itemId)


    # Step 3: Validate Kafka Event (consumer was started in Background)
    * def addEvent = call read('classpath:karatehelpers/kafka-wait.feature') { eventType: 'ITEM_CREATED', itemId: '#(itemId)', timeout: 15000 }
    * print 'Received Kafka message:',  addEvent
    Then match addEvent.message.eventType == 'ITEM_CREATED'
    And match addEvent.message.payload.name == itemName
    And match addEvent.message.payload.quantity == itemQuantity
    And match addEvent.message.payload.correlationId == correlationId
    And match addEvent.message.payload.itemId == itemId

    # Step 4: Poll status endpoint until item is COMPLETED(means DB insertion successful and item is added)
    * def response = call read('classpath:karatehelpers/get-status.feature') { correlationId: '#(correlationId)', authHeader: '#(authHeader)' }
    * def finalStatus = response.finalStatus
    * print 'Final status response:', finalStatus
    Then match finalStatus.status == 'COMPLETED'
    And match finalStatus.completed.name == itemName
    And match finalStatus.completed.quantity == itemQuantity
    And match finalStatus.completed.itemId == itemId


    # Step 4: Validate item is added
    Given url baseUrl + '/items/'
    And header Authorization = authHeader
    When method GET
    Then status 200
    * karate.log('Response from GET /items:', response)
    * def addedItem = karate.filter(response, function(x){ return x.itemid == itemId })
    Then match addedItem[0].name == itemName
    And match addedItem[0].quantity == itemQuantity
