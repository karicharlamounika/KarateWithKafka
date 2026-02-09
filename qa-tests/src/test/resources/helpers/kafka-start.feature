@Ignore
Feature: Start Kafka Server

    Background:
        * def KarateTestHelper = Java.type('utils.KarateTestHelper')

    Scenario: Initialize and start Kafka
        * def helper = new KarateTestHelper()
        * helper.startKafka()
        * print 'Kafka server started successfully'