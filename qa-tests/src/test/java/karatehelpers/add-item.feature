@Ignore
Feature: Add Item 

  Background:
    # API Gateway base URL
    * def baseUrl = baseUrl
    * def authHeader = authHeader

    # User login payload
    * def loginPayload = { "email": "#(testUser.email)", "password": "#(testUser.password)"}
    * def itemName = 'Item_' + java.lang.System.currentTimeMillis()
    * def itemQuantity = Math.floor(Math.random() * 100) + 1
    # Item payload
    * def itemPayload = { "name": "#(itemName)", "quantity": "#(itemQuantity)" }

    # Step 0: Start Kafka Consumer BEFORE API calls
    * print 'Starting Kafka consumer...'
    * def topic = { topic: 'items-events' }
    * call read('classpath:karatehelpers/kafka-start.feature') topic

  Scenario: User adds an item and system updates via Kafka

    # Step 1: Add Item
    Given url baseUrl + '/items'
    And request itemPayload
    And header Authorization = authHeader
    When method POST
    Then status 202
    And match response.message == 'Item creation queued'
    And match response.item.name == itemName

    * def correlationId = (response.correlationId).trim()
    * karate.log('Received correlationId:', correlationId)
    * def statusUrl = response.statusUrl
    * karate.log('Received statusUrl:', statusUrl)
    * def itemId = (response.item.itemId).trim()
    * karate.log('Received itemId:', itemId)

    # Step 2: Poll status endpoint until item is COMPLETED(means DB insertion successful and item is added)
    * def response = call read('classpath:karatehelpers/get-status.feature') { correlationId: '#(correlationId)', authHeader: '#(authHeader)' }
    * def finalStatus = response.finalStatus
    * print 'Final status response:', finalStatus
    Then match finalStatus.status == 'COMPLETED'

