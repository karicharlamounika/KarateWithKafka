Feature: Item CRUD API chaining validation (API-only)

  Background:

    # Login payload
    * def loginPayload =
      """
      {
        "email": "#(testUser.email)",
        "password": "#(testUser.password)"
      }
      """

    # Add item payload
    * def addItemPayload =
      """
      {
        "name": "Laptop",
        "quantity": 10
      }
      """

    # Update item payload (will override later)
    * def updateItemPayload =
      """
      {
        "name": "Gaming Laptop",
        "quantity": 15
      }
      """

    * def authHeaders = {}

    # Ensure user exists before login
    * call read('classpath:karatehelpers/register-user.feature')

  Scenario: User adds, updates, and deletes an item successfully

    # Step 1: Login
    Given url baseUrl + '/auth/login'
    And request loginPayload
    When method POST
    Then status 200
    * def token = response.token
    * set authHeaders.Authorization = 'Bearer ' + token

    # Step 2: Add item
    Given url baseUrl + '/items'
    And headers authHeaders
    And request addItemPayload
    When method POST
    Then status 202
    And match response.message == 'Item creation queued'
    * def dbLatest = call read('classpath:utils/dbQuery.js')
      """
      { latest: true }
      """
    * def itemId = dbLatest.id

    # Step 3: Update item
    Given url baseUrl + '/items/' + itemId
    And headers authHeaders
    And request updateItemPayload
    When method PUT
    Then status 202
    And match response.message == 'Item update queued'

    # Step 4: Delete item
    Given url baseUrl + '/items/' + itemId
    And headers authHeaders
    When method DELETE
    Then status 202
    And match response.message == 'Item deletion queued'
