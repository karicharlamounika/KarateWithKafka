Feature: Item CRUD API chaining validation (API-only)

  Background:
    * def baseUrl = karate.config.baseUrl

    # Login payload
    * def loginPayload =
      """
      {
        "email": "#(karate.config.testUser.email)",
        "password": "#(karate.config.testUser.password)"
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
    Then status 201
    And match response ==
    """
    {
    id: '#number',
    name: 'Laptop',
    quantity: 10
    }
    """

    * def itemId = response.id

    # Step 3: Update item
    Given url baseUrl + '/items/' + itemId
    And headers authHeaders
    And request updateItemPayload
    When method PUT
    Then status 200
    And match response ==
    """
    {
    id: '#(itemId)',
    name: 'Gaming Laptop',
    quantity: 15
    }
    """

    # Step 4: Delete item
    Given url baseUrl + '/items/' + itemId
    And headers authHeaders
    When method DELETE
    Then status 204
