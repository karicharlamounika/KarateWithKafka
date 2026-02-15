function fn() {
    karate.configure('logPrettyRequest', true);
    karate.configure('logPrettyResponse', true);
  var env = karate.env || 'local';
  karate.log('karate.env was:', env);

  var baseUrlOverride = karate.properties['baseUrl'] || java.lang.System.getenv('BASE_URL');

  var config = {
    baseUrl: 'http://localhost:8080',

    kafka: {
      bootstrap: 'localhost:9092',
      topic: 'items-events'
    },

    readDbUrl: 'jdbc:sqlite:/data/items_read.db',

    testUser: {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'Password123'
    }
  };

  // Docker & CI (same networking!)
  if (env === 'docker' || env === 'ci') {
    karate.log('Running in Docker-based environment');

    config.baseUrl = 'http://gateway:8080';
    config.kafka.bootstrap = 'kafka:9092';
    config.kafka.topic = 'items-events';
    config.testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'Password123'
    };

    // DB paths remain the same (mounted volume)
    config.readDbUrl = 'jdbc:sqlite:/data/items_read.db';
  }

  if (baseUrlOverride) {
    config.baseUrl = baseUrlOverride;
    karate.log('Using BASE_URL override:', config.baseUrl);
  }

  karate.log('Final Base URL:', config.baseUrl);
  karate.log('Kafka Bootstrap:', config.kafka.bootstrap);

  return config;
}
