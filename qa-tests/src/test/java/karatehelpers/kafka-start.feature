@Ignore
Feature: Start Kafka consumer

  Background:
    * def KafkaTestHelper = Java.type('utils.KafkaTestHelper')

  Scenario: Initialize and start Kafka consumer
    * def bootstrap = kafka.bootstrap
    * def topic = (karate.get('topic') || kafka.topic)
    * KafkaTestHelper.clearMessages()
    * def result = KafkaTestHelper.startConsumer(bootstrap, topic)
    * print 'Kafka consumer started successfully:', result
