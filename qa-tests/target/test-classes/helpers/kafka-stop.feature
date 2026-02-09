Feature: Stop Kafka

    Background:
        * def kafkaHelper = Java.type('path.to.kafkatesthelper')

    Scenario: Stop Kafka Broker
        Given I have started Kafka
        When I stop Kafka
        Then Kafka should be stopped successfully

    Given def startKafka = function() {
        kafkaHelper.startKafka()
    }

    When def stopKafka = function() {
        kafkaHelper.stopKafka()
    }

    Then def verifyKafkaStopped = function() {
        // Add verification logic here
    }