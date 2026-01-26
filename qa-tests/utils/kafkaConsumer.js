var Kafka = Java.type('org.apache.kafka.clients.consumer.KafkaConsumer');
var Properties = Java.type('java.util.Properties');
var Arrays = Java.type('java.util.Arrays');
var Duration = Java.type('java.time.Duration');
var System = Java.type('java.lang.System');
var ArrayList = Java.type('java.util.ArrayList');
var Thread = Java.type('java.lang.Thread');

/**
 * Shared message store (JVM-level)
 */
var messageStore = new ArrayList();
var consumerThread = null;

/**
 * Start Kafka consumer (called once in Background)
 */
function startConsumer(params) {
  var kafkaConfig = karate.config.kafka;

  var props = new Properties();
  props.put('bootstrap.servers', kafkaConfig.bootstrap);
  props.put(
    'group.id',
    kafkaConfig.groupId + '-' + System.currentTimeMillis()
  );
  props.put(
    'key.deserializer',
    'org.apache.kafka.common.serialization.StringDeserializer'
  );
  props.put(
    'value.deserializer',
    'org.apache.kafka.common.serialization.StringDeserializer'
  );
  props.put('auto.offset.reset', 'latest');
  props.put('enable.auto.commit', 'true');

  var consumer = new KafkaConsumer(props);
  consumer.subscribe(Arrays.asList(params.topic));

  consumerThread = new Thread(function () {
    while (true) {
      var records = consumer.poll(Duration.ofMillis(500));
      var iter = records.iterator();

      while (iter.hasNext()) {
        var record = iter.next();
        messageStore.add(JSON.parse(record.value()));
      }
    }
  });

  consumerThread.setDaemon(true);
  consumerThread.start();

  return { status: 'Kafka consumer started' };
}

/**
 * Wait for a specific event (called in Scenario)
 */
function waitForEvent(params) {
  var expectedItemId = params.itemId;
  var timeoutMs = params.timeout || 10000;
  var startTime = System.currentTimeMillis();

  while (System.currentTimeMillis() - startTime < timeoutMs) {
    var iter = messageStore.iterator();

    while (iter.hasNext()) {
      var message = iter.next();
      if (message.data && message.data.id == expectedItemId) {
        return message;
      }
    }

    Thread.sleep(200);
  }

  karate.fail(
    'Kafka message with itemId ' +
      expectedItemId +
      ' not received within ' +
      timeoutMs +
      ' ms'
  );
}

