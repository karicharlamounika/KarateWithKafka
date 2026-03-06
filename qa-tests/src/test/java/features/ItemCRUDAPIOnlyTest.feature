Feature: Item CRUD API chaining validation (API-only)

  Background:
    * def baseUrl = baseUrl

    # User registration payload
    * def registerPayload =
      """
      {
        "firstName": "#(testUser.firstName)",
        "lastName": "#(testUser.lastName)",
        "email": "#(testUser.email)",
        "password": "#(testUser.password)"
      }
      """
    # User login payload
    * def loginPayload = { "email": "#(testUser.email)", "password": "#(testUser.password)"}
    * def itemName = 'Item_' + java.lang.System.currentTimeMillis()
    * def itemQuantity = Math.floor(Math.random() * 100) + 1
    # Item payload
    * def itemPayload = { "name": "#(itemName)", "quantity": "#(itemQuantity)" }
    # Updated item payload
    * def updatedItemName = 'UpdatedItem_' + java.lang.System.currentTimeMillis()
    * def updatedItemQuantity = Math.floor(Math.random() * 100) + 1
    * def updateItemPayload = { "name": "#(updatedItemName)", "quantity": "#(updatedItemQuantity)" }


  Scenario: User registers, logins,  adds, updates, and deletes an item successfully

    # Step 1: Registration — validate 201 or 409 (user already exists) + response shape
    Given url baseUrl + '/auth/register'
    And request registerPayload
    When method POST
    * def statusCode = responseStatus
    * assert statusCode == 201 || statusCode == 409

    # Step 1: Login — validate 202 + response shape
    Given url baseUrl + '/auth/login'
    And request loginPayload
    When method POST
    Then status 200
    * def token = response.token
    * def authHeader = 'Bearer ' + token

    # Step 2: Add item — validate 202 + response shape
    Given url baseUrl + '/items'
    And header Authorization = authHeader
    And request itemPayload
    When method POST
    Then status 202
    And match response.message == 'Item creation queued'
    And match response.correlationId == '#string'
    And match response.statusUrl == '#string'
    And match response.item.itemId == '#string'
    And match response.item.name == itemName
    And match response.item.quantity == itemQuantity
    And match response.item.status == 'PENDING'
    * def correlationId = (response.correlationId).trim()

    # ✅ Wait for item to be in DB before GET /items
    * def statusResponse = call read('classpath:karatehelpers/get-status.feature') { correlationId: '#(correlationId)', authHeader: '#(authHeader)' }
    * match statusResponse.finalStatus.status == 'COMPLETED'

    # Step 2: Get items - validate 200 _response shape and pick an existing itemId for update/delete
    Given url baseUrl + '/items'
    And header Authorization = authHeader
    When method GET
    Then status 200
    * def firstItem = response[0]
    And match firstItem ==
      """
      {
      itemid: '#string',
      name: '#string',
      quantity: '#number',
      created_at: '#string'
      }
      """
    # ✅ Pick first item from the list — guaranteed to exist in DB
    * def itemId = firstItem.itemid
    * karate.log('Using existing itemId for update/delete:', itemId)

    # Step 3: Update item — validate 202 + response shape
    Given url baseUrl + '/items/' + itemId
    And header Authorization = authHeader
    And request updateItemPayload
    When method PUT
    Then status 202
    And match response.message == 'Item update queued'
    And match response.correlationId == '#string'
    And match response.statusUrl == '#string'
    And match response.item.itemId == itemId
    And match response.item.name == '#string'
    And match response.item.quantity == '#number'
    And match response.item.status == 'PENDING'

    # Step 4: Delete item — validate 202 + response shape
    Given url baseUrl + '/items/' + itemId
    And header Authorization = authHeader
    When method DELETE
    Then status 202
    And match response.message == 'Item deletion queued'
    And match response.correlationId == '#string'
    And match response.statusUrl == '#string'
    And match response.item.itemId == itemId
    And match response.item.name == '#string'
    And match response.item.quantity == '#number'
    And match response.item.status == 'PENDING'
