@integration
Feature: Update Item flow with Kafka and DB verification

  Background:
    # Base URL via API Gateway
    * def baseUrl = baseUrl
    * def authHeader = authHeader

    # Updated item payload
    * def updatedItemName = 'UpdatedItem_' + java.lang.System.currentTimeMillis()
    * def updatedItemQuantity = Math.floor(Math.random() * 100) + 1 
    * def updateItemPayload = { "name": "#(updatedItemName)", "quantity": "#(updatedItemQuantity)" }

    # Step 0: Start Kafka and Add Item (prerequisite)
    * def addItem = call read('classpath:karatehelpers/add-item.feature')
    * def itemId = addItem.itemId

  Scenario: User updates an item and system propagates changes via Kafka

    # Step 1: Update Item
    Given url baseUrl + '/items/' + itemId
    And header Authorization = authHeader
    And request updateItemPayload
    When method PUT
    Then status 202
    And match response.message == 'Item update queued'
    And match response.item.name == updatedItemName
    And match response.item.quantity == updatedItemQuantity
    And match response.item.itemId == itemId
    * def correlationId = response.correlationId
    * karate.log('Received correlationId:', correlationId)
    * def statusUrl = response.statusUrl
    * karate.log('Received statusUrl:', statusUrl)
    * karate.log('Received itemId:', itemId)

    # Step 2: Validate Kafka UPDATE event
    * def updateEvent = call read('classpath:karatehelpers/kafka-wait.feature') { eventType: 'ITEM_UPDATED',itemId: '#(itemId)', timeout: 15000 }
    * print 'Received Kafka update event:', updateEvent  
    Then match updateEvent.message.eventType == 'ITEM_UPDATED'
    And match updateEvent.message.payload.itemId == itemId
    And match updateEvent.message.payload.name == updatedItemName
    And match updateEvent.message.payload.quantity == updatedItemQuantity
    And match updateEvent.message.payload.correlationId == correlationId

    # Step 3: Poll status endpoint until item is COMPLETED(means DB updation successful and item is updated)
    * def response = call read('classpath:karatehelpers/get-status.feature') { correlationId: '#(correlationId)', authHeader: '#(authHeader)' }
    * def finalStatus = response.finalStatus
    * print 'Final status response:', finalStatus
    Then match finalStatus.status == 'COMPLETED'
    And match finalStatus.completed.name == updatedItemName
    And match finalStatus.completed.quantity == updatedItemQuantity
    And match finalStatus.completed.itemId == itemId

    # Step 4: Validate item is updated
    Given url baseUrl + '/items/'
    And header Authorization = authHeader
    When method GET
    Then status 200
    * def updatedItem = karate.filter(response, function(x){ return x.itemid == itemId })
    * karate.log('Updated item from GET /items:', updatedItem)
    Then match updatedItem[0].name == updatedItemName
    And match updatedItem[0].quantity == updatedItemQuantity
    And match updatedItem[0].itemid == itemId
