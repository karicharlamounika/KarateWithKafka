@Ignore
Feature: Wait for Kafka event

  Background:
    * def KafkaTestHelper = Java.type('utils.KafkaTestHelper')

  Scenario: Wait for Kafka event by optional itemId and optional eventType
    * def itemId = karate.get('itemId')
    * def timeout = karate.get('timeout') || 10000
    * def eventType = karate.get('eventType')
    * def message =
    """
    eventType
      ? (itemId != null
          ? KafkaTestHelper.waitForEventType(eventType, itemId, timeout)
          : KafkaTestHelper.waitForEventType(eventType, timeout))
      : KafkaTestHelper.waitForEvent(itemId, timeout)
    """
    * return message
