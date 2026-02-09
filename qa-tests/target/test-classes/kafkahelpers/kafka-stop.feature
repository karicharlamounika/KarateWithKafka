@Ignore
Feature: Stop Kafka consumer

  Background:
    * def KafkaTestHelper = Java.type('utils.KafkaTestHelper')
  
  Scenario: Stop Kafka consumer
    * KafkaTestHelper.stopConsumer()
    * print 'Kafka consumer stopped successfully'