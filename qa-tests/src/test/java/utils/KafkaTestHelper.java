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

public class KafkaTestHelper {

    private static final Logger logger = LoggerFactory.getLogger(KafkaTestHelper.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    // ✅ Per-thread consumers and queues
    private static final ConcurrentHashMap<Long, KafkaConsumer<String, String>> consumers = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<Long, BlockingQueue<JsonNode>> queues = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<Long, Thread> consumerThreads = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<Long, AtomicBoolean> runningFlags = new ConcurrentHashMap<>();

    private static long threadId() {
        return Thread.currentThread().getId();
    }

    private static BlockingQueue<JsonNode> getQueue() {
        return queues.computeIfAbsent(threadId(), id -> new LinkedBlockingQueue<>());
    }

    private static void ensureTopicExists(String bootstrapServers, String topic) {
        Properties adminProps = new Properties();
        adminProps.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        try (AdminClient admin = AdminClient.create(adminProps)) {
            Set<String> names = admin.listTopics().names().get(10, TimeUnit.SECONDS);
            if (!names.contains(topic)) {
                admin.createTopics(Collections.singletonList(
                    new NewTopic(topic, 1, (short) 1))).all().get(10, TimeUnit.SECONDS);
                logger.info("Created topic for tests: {}", topic);
            }
        } catch (Exception e) {
            logger.warn("Topic check/create failed (continuing): {}", e.getMessage());
        }
    }

    /** Start Kafka consumer — one per thread */
    public static Map<String, Object> startConsumer(String bootstrapServers, String topic) {
        long id = threadId();

        if (consumers.containsKey(id)) {
            logger.info("Kafka consumer already running for thread {}", id);
            return Map.of("status", "already_running");
        }

        // ✅ Unique group ID per thread — each consumer reads from beginning independently
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "karate-test-" + id + "-" + System.currentTimeMillis());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");

        ensureTopicExists(bootstrapServers, topic);

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList(topic));

        AtomicBoolean running = new AtomicBoolean(true);
        BlockingQueue<JsonNode> queue = new LinkedBlockingQueue<>();

        consumers.put(id, consumer);
        queues.put(id, queue);
        runningFlags.put(id, running);

        Thread thread = new Thread(() -> consumeMessages(consumer, queue, running, topic, id));
        thread.setDaemon(true);
        thread.start();
        consumerThreads.put(id, thread);

        logger.info("Kafka consumer started for thread {} topic: {}", id, topic);
        return Map.of("status", "started", "topic", topic);
    }

    /** Kafka consumer loop — per thread */
    private static void consumeMessages(KafkaConsumer<String, String> consumer,
                                         BlockingQueue<JsonNode> queue,
                                         AtomicBoolean running,
                                         String topic, long threadId) {
        logger.info("Kafka consumer thread {} started for topic: {}", threadId, topic);
        try {
            while (running.get()) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
                for (ConsumerRecord<String, String> record : records) {
                    try {
                        JsonNode message = objectMapper.readTree(record.value());
                        queue.put(message);
                        logger.debug("Thread {} consumed message: {}", threadId, message);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    } catch (Exception e) {
                        logger.error("Thread {} error parsing message: {}", threadId, record.value(), e);
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Error in Kafka consumer thread {}", threadId, e);
        } finally {
            consumer.close();
            logger.info("Kafka consumer thread {} closed", threadId);
        }
    }

    /** Central wait method — uses per-thread queue */
    private static Map<String, Object> waitForMessage(Predicate<JsonNode> filter, int timeoutMs) {
        BlockingQueue<JsonNode> queue = getQueue();
        List<JsonNode> seen = new ArrayList<>();
        long endTime = System.currentTimeMillis() + timeoutMs;

        try {
            while (System.currentTimeMillis() < endTime) {
                JsonNode message = queue.poll(200, TimeUnit.MILLISECONDS);
                if (message == null) continue;

                if (filter.test(message)) {
                    queue.addAll(seen);  // ✅ restore non-matching
                    logger.info("✅ Thread {} found matching message: {}", threadId(), message);
                    return convertJsonNodeToMap(message);
                } else {
                    seen.add(message);
                }
            }
            queue.addAll(seen);  // ✅ restore on timeout
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            queue.addAll(seen);
            throw new RuntimeException("Interrupted while waiting for Kafka message", e);
        }

        throw new RuntimeException("Kafka message not received within " + timeoutMs + "ms. " +
            "Thread: " + threadId() + " Queue size: " + queue.size());
    }

    /** Wait for event by itemId */
    public static Map<String, Object> waitForEvent(String itemId, int timeoutMs) {
        return waitForMessage(msg -> msg.has("payload") &&
                msg.get("payload").has("itemId") &&
                msg.get("payload").get("itemId").asText().equals(itemId), timeoutMs);
    }

    /** Wait for event by eventType and itemId */
    public static Map<String, Object> waitForEventType(String eventType, String itemId, int timeoutMs) {
        return waitForMessage(msg -> msg.has("eventType") && msg.has("payload") &&
                msg.get("eventType").asText().equals(eventType) &&
                msg.get("payload").has("itemId") &&
                msg.get("payload").get("itemId").asText().equals(itemId), timeoutMs);
    }

    /** Wait for event by eventType only */
    public static Map<String, Object> waitForEventType(String eventType, int timeoutMs) {
        return waitForMessage(msg -> msg.has("eventType") &&
                msg.get("eventType").asText().equals(eventType), timeoutMs);
    }

    /** Clear messages for current thread only */
    public static void clearMessages() {
        getQueue().clear();
        logger.info("Message queue cleared for thread {}", threadId());
    }

    /** Stop consumer for current thread only */
    public static void stopConsumer() {
        long id = threadId();
        AtomicBoolean running = runningFlags.get(id);
        if (running != null && running.get()) {
            running.set(false);
            Thread thread = consumerThreads.get(id);
            if (thread != null) {
                try {
                    thread.join(5000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            consumers.remove(id);
            queues.remove(id);
            consumerThreads.remove(id);
            runningFlags.remove(id);
            logger.info("Kafka consumer stopped for thread {}", id);
        }
    }

    /** Message count for current thread */
    public static int getMessageCount() {
        return getQueue().size();
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