const { Kafka } = require("kafkajs");
const db = require("./db");

const kafka = new Kafka({
  clientId: "read-service",
  brokers: ["localhost:9092"]
});

const consumer = kafka.consumer({ groupId: "read-service-group" });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: "items-events", fromBeginning: true });

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
