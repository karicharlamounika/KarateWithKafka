@Ignore
Feature: Start Kafka consumer

  Background:
    * def KafkaTestHelper = Java.type('utils.KafkaTestHelper')

  Scenario: Initialize and start Kafka consumer
    * def bootstrap = karate.config.kafka.bootstrap
    * def topic = (karate.get('topic') || karate.config.kafka.topic)
    * KafkaTestHelper.clearMessages()
    * def result = KafkaTestHelper.startConsumer(bootstrap, topic)
    * print 'Kafka consumer started successfully:', result
