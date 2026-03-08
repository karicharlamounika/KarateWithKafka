@integration
Feature: Delete Item flow with Kafka and DB verification

  Background:
    # API Gateway base URL
    * def baseUrl = baseUrl
    * def authHeader = authHeader


  Scenario: User deletes an item and system propagates changes via Kafka

    # Step 1: Start Kafka and Add Item (prerequisite)
    * def addItem = call read('classpath:karatehelpers/add-item.feature')
    * def itemId = addItem.itemId
    * def itemName = addItem.itemName
    * def itemQuantity = addItem.itemQuantity

    # Step 2: Delete Item
    Given url baseUrl + '/items/' + itemId
    And header Authorization = authHeader
    When method DELETE
    Then status 202
    And match response.message == 'Item deletion queued'
    And match response.item.name == itemName
    And match response.item.quantity == itemQuantity
    And match response.item.itemId == itemId
    * def correlationId = response.correlationId
    * karate.log('Received correlationId:', correlationId)
    * def statusUrl = response.statusUrl
    * karate.log('Received statusUrl:', statusUrl)
    * karate.log('Received itemId:', itemId)

    # Step 3: Validate Kafka DELETE event
    * def deleteEvent = call read('classpath:karatehelpers/kafka-wait.feature') { eventType: 'ITEM_DELETED',itemId: '#(itemId)', timeout: 15000 }
    * print 'Received Kafka delete event:', deleteEvent
    Then match deleteEvent.message.eventType == 'ITEM_DELETED'
    And match deleteEvent.message.payload.itemId == itemId
    And match deleteEvent.message.payload.correlationId == correlationId
    
    # Step 4: Poll status endpoint until it is COMPLETED(means item is deleted from DB)
    * def response = call read('classpath:karatehelpers/get-status.feature') { correlationId: '#(correlationId)', authHeader: '#(authHeader)' }
    * def finalStatus = response.finalStatus
    * print 'Final status response:', finalStatus
    Then match finalStatus.status == 'COMPLETED'
    And match finalStatus.completed.name == itemName
    And match finalStatus.completed.quantity == itemQuantity
    And match finalStatus.completed.itemId == itemId

    # Step 5: Validate item is deleted
    Given url baseUrl + '/items/'
    And header Authorization = authHeader
    When method GET
    Then status 200
    * def deletedItem = karate.filter(response, function(x){ return x.itemid == itemId })
    Then match deletedItem == []
