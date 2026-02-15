package utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Predicate;

/**
 * Kafka Test Helper optimized with BlockingQueue & CountDownLatch
 */
public class KafkaTestHelper {

    private static final Logger logger = LoggerFactory.getLogger(KafkaTestHelper.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    // Thread-safe blocking queue for messages
    private static final BlockingQueue<JsonNode> messageQueue = new LinkedBlockingQueue<>();
    
    private static Thread consumerThread;
    private static KafkaConsumer<String, String> consumer;
    private static final AtomicBoolean isRunning = new AtomicBoolean(false);

    private static void ensureTopicExists(String bootstrapServers, String topic) {
        Properties adminProps = new Properties();
        adminProps.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        try (AdminClient admin = AdminClient.create(adminProps)) {
            Set<String> names = admin.listTopics().names().get(10, TimeUnit.SECONDS);
            if (!names.contains(topic)) {
                admin.createTopics(Collections.singletonList(new NewTopic(topic, 1, (short) 1))).all().get(10, TimeUnit.SECONDS);
                logger.info("Created topic for tests: {}", topic);
            }
        } catch (Exception e) {
            logger.warn("Topic check/create failed (continuing): {}", e.getMessage());
        }
    }

    /** Start Kafka consumer */
    public static synchronized Map<String, Object> startConsumer(String bootstrapServers, String topic) {
        if (isRunning.get()) {
            logger.info("Kafka consumer already running");
            return Map.of("status", "already_running");
        }

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "karate-test-" + System.currentTimeMillis());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");

        ensureTopicExists(bootstrapServers, topic);

        consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList(topic));

        isRunning.set(true);
        consumerThread = new Thread(() -> consumeMessages(topic));
        consumerThread.setDaemon(true);
        consumerThread.start();

        logger.info("Kafka consumer started successfully for topic: {}", topic);
        return Map.of("status", "started", "topic", topic);
    }

    /** Kafka consumer loop */
    private static void consumeMessages(String topic) {
        logger.info("Kafka consumer thread started for topic: {}", topic);
        try {
            while (isRunning.get()) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
                for (ConsumerRecord<String, String> record : records) {
                    try {
                        JsonNode message = objectMapper.readTree(record.value());
                        messageQueue.put(message);  // BlockingQueue ensures thread-safety
                        logger.info("Consumed message: {}", message);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    } catch (Exception e) {
                        logger.error("Error parsing message: {}", record.value(), e);
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Error in Kafka consumer thread", e);
        } finally {
            consumer.close();
            logger.info("Kafka consumer closed");
        }
    }

    /** Generic wait for message with predicate using timeout */
    private static Map<String, Object> waitForMessage(Predicate<JsonNode> filter, int timeoutMs) {
        long endTime = System.currentTimeMillis() + timeoutMs;

        try {
            while (System.currentTimeMillis() < endTime) {
                JsonNode message = messageQueue.poll(200, TimeUnit.MILLISECONDS); // wait for message
                if (message == null) continue;

                if (filter.test(message)) {
                    logger.info("Found matching message: {}", message);
                    return convertJsonNodeToMap(message);
                } else {
                    // Not matching, put it back for other waits
                    messageQueue.put(message);
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while waiting for Kafka message", e);
        }

        throw new RuntimeException("Kafka message not received within " + timeoutMs + "ms");
    }

    /** Wait for event by itemId */
    public static Map<String, Object> waitForEvent(int itemId, int timeoutMs) {
        return waitForMessage(msg -> msg.has("payload") && msg.get("payload").has("id") &&
                msg.get("payload").get("id").asInt() == itemId, timeoutMs);
    }

    /** Wait for event by eventType and itemId */
    public static Map<String, Object> waitForEventType(String eventType, int itemId, int timeoutMs) {
        return waitForMessage(msg -> msg.has("eventType") && msg.has("payload") &&
                msg.get("eventType").asText().equals(eventType) &&
                msg.get("payload").has("id") && msg.get("payload").get("id").asInt() == itemId, timeoutMs);
    }

    /** Wait for event by eventType only */
    public static Map<String, Object> waitForEventType(String eventType, int timeoutMs) {
        return waitForMessage(msg -> msg.has("eventType") &&
                msg.get("eventType").asText().equals(eventType), timeoutMs);
    }

    /** Clear messages */
    public static void clearMessages() {
        messageQueue.clear();
        logger.info("Message queue cleared");
    }

    /** Stop Kafka consumer */
    public static void stopConsumer() {
        if (isRunning.get()) {
            isRunning.set(false);
            if (consumerThread != null) {
                try {
                    consumerThread.join(5000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            logger.info("Kafka consumer stopped");
        }
    }

    /** Message count */
    public static int getMessageCount() {
        return messageQueue.size();
    }

    /** Convert JsonNode to Map */
    private static Map<String, Object> convertJsonNodeToMap(JsonNode node) {
        try {
            return objectMapper.convertValue(node, Map.class);
        } catch (Exception e) {
            logger.error("Error converting JsonNode to Map", e);
            return Collections.emptyMap();
        }
    }
}
