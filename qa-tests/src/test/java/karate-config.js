function fn() {
  var env = karate.env || 'local';
  karate.log('karate.env was:', env);

  var config = {
    baseUrl: 'http://localhost:8080',

    kafka: {
      bootstrap: 'localhost:9092',
      topic: 'items-events'
    },

    readDbUrl: 'jdbc:sqlite:/data/items_read.db',

    testUser: {
      email: 'testuser@example.com',
      password: 'Password123'
    }
  };

  // Docker & CI (same networking!)
  if (env === 'docker' || env === 'ci') {
    karate.log('Running in Docker-based environment');

    config.baseUrl = 'http://gateway:8080';
    config.kafka.bootstrap = 'kafka:9092';

    // DB paths remain the same (mounted volume)
    config.readDbUrl = 'jdbc:sqlite:/data/items_read.db';
  }

  karate.log('Final Base URL:', config.baseUrl);
  karate.log('Kafka Bootstrap:', config.kafka.bootstrap);

  return config;
}
