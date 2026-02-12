const { Kafka } = require("kafkajs");
const db = require("./db");

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);
const topic = process.env.KAFKA_TOPIC || "items-events";
const groupId = process.env.KAFKA_GROUP_ID || "read-service-group";

const kafka = new Kafka({
  clientId: "read-service",
  brokers
});

const consumer = kafka.consumer({ groupId });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  console.log("📝 Read-service Kafka consumer started");

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());

      switch (event.eventType) {
        case "ITEM_CREATED":
          db.run(
            "INSERT INTO items (name, quantity) VALUES (?, ?)",
            [event.payload.name, event.payload.quantity]
          );
          break;

        case "ITEM_UPDATED":
          db.run(
            "UPDATE items SET name = ?, quantity = ? WHERE id = ?",
            [event.payload.name, event.payload.quantity, event.payload.id]
          );
          break;

        case "ITEM_DELETED":
          db.run("DELETE FROM items WHERE id = ?", [event.payload.id]);
          break;
      }
    }
  });
}

startConsumer().catch(console.error);
