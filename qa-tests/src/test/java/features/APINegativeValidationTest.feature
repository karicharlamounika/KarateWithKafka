Feature: API negative validation

    Background:
        * def baseUrl = baseUrl
        * def loginPayload = { email: '#(testUser.email)', password: '#(testUser.password)' }
        * call read('classpath:karatehelpers/register-user.feature')

        Given url baseUrl + '/auth/login'
        And request loginPayload
        When method POST
        Then status 200
        * def validToken = response.token
        * def authHeader = 'Bearer ' + validToken
        * def invalidAuthHeader = 'Bearer invalidtoken123'


    # ─── 1. Registration ─────────────────────────────────────────────────────────

    Scenario Outline: Registration fails with invalid payload - <scenario>
        Given url baseUrl + '/auth/register'
        And request karate.fromString(body)
        When method POST
        Then status <status>
        And match response.error == <message>

        Examples:
            | scenario           | body                                                                                        | status | message                   |
            | missing all fields | {}                                                                                          | 400    | 'Missing required fields' |
            | missing email      | { firstName: 'John', lastName: 'Doe', password: 'password123' }                             | 400    | 'Missing required fields' |
            | missing password   | { firstName: 'John', lastName: 'Doe', email: 'test@test.com' }                              | 400    | 'Missing required fields' |
            | missing name       | { email: 'test@test.com', password: 'password123' }                                         | 400    | 'Missing required fields' |
            | duplicate email    | { firstName: 'John', lastName: 'Doe', email: 'testuser@example.com', password: 'password123' } | 409    | 'User already exists'     |

    # ─── 2. Login ────────────────────────────────────────────────────────────────

    Scenario Outline: Login fails with invalid payload - <scenario>
        Given url baseUrl + '/auth/login'
        And request karate.fromString(body)
        When method POST
        Then status <status>
        And match response.message == <message>

        Examples:
            | scenario          | body                                                       | status | message                           |
            | empty body        | {}                                                         | 400    | 'Email and password are required' |
            | missing email     | { password: 'password123' }                                | 400    | 'Email and password are required' |
            | missing password  | { email: 'test@test.com' }                                 | 400    | 'Email and password are required' |
            | wrong password    | { email: 'testuser@example.com', password: 'wrongpassword' }  | 401    | 'Invalid credentials'             |
            | nonexistent email | { email: 'nonexistent@test.com', password: 'password123' } | 401    | 'Invalid credentials'             |

    # ─── 3. Auth failures ────────────────────────────────────────────────────────

    Scenario Outline: Item operation fails with invalid auth - <method> <scenario>
        Given url baseUrl + <url>
        And header Authorization = <token>
        And def hasBody = '<method>' == 'POST' || '<method>' == 'PUT'
        * if (hasBody) karate.set('request', { name: 'Laptop', quantity: 10 })
        When method <method>
        Then status <status>
        And match response.message == <message>

        Examples:
            | scenario         | method | url                           | token             | status | message                |
            | POST no token    | POST   | '/items'                      | ''                | 401    | 'Access token missing' |
            | POST bad token   | POST   | '/items'                      | invalidAuthHeader | 403    | 'Invalid token'        |
            | PUT no token     | PUT    | '/items/item_unknownid123'    | ''                | 401    | 'Access token missing' |
            | PUT bad token    | PUT    | '/items/item_unknownid123'    | invalidAuthHeader | 403    | 'Invalid token'        |
            | DELETE no token  | DELETE | '/items/item_unknownid123'    | ''                | 401    | 'Access token missing' |
            | DELETE bad token | DELETE | '/items/item_unknownid123'    | invalidAuthHeader | 403    | 'Invalid token'        |
            | STATUS no token  | GET    | '/items/req_unknownid/status' | ''                | 401    | 'Access token missing' |
            | STATUS bad token | GET    | '/items/req_unknownid/status' | invalidAuthHeader | 403    | 'Invalid token'        |

    # ─── 4. Invalid body ─────────────────────────────────────────────────────────

    Scenario Outline: Item operation fails with invalid body - <method> <scenario>
        Given url baseUrl + '/items' + <path>
        And header Authorization = authHeader
        And request body
        When method <method>
        Then status 400
        And match response.error == 'Name and quantity required'

        Examples:
            | scenario          | method | path                 | body                               |
            | POST missing name | POST   | ''                   | { quantity: 10 }                   |
            | POST missing qty  | POST   | ''                   | { name: 'Laptop' }                 |
            | POST empty body   | POST   | ''                   | {}                                 |
            | POST empty name   | POST   | ''                   | { name: '', quantity: 10 }         |
            | POST zero qty     | POST   | ''                   | { name: 'Laptop', quantity: 0}     |
            | POST negative qty | POST   | ''                   | { name: 'Laptop', quantity: -1}    |
            | POST string qty   | POST   | ''                   | { name: 'Laptop', quantity: 'ten'} |
            | PUT missing name  | PUT    | '/item_unknownid123' | { quantity: 10 }                   |
            | PUT missing qty   | PUT    | '/item_unknownid123' | { name: 'Laptop' }                 |
            | PUT empty body    | PUT    | '/item_unknownid123' | {}                                 |

    # ─── 5. Unknown itemId / correlationId ───────────────────────────────────────

    Scenario Outline: Operation fails with unknown id - <scenario>
        Given url baseUrl + <url>
        And header Authorization = authHeader
        * if ('<method>' == 'DELETE') karate.set('request', null)
        When method <method>
        Then status 404
        And match response.error == <message>

        Examples:
            | scenario                  | method | url                                 | message          |
            | DELETE unknown itemId     | DELETE | '/items/item_doesnotexist999'       | 'Item not found' |
            | GET unknown correlationId | GET    | '/items/req_doesnotexist999/status' | 'Job not found'  |