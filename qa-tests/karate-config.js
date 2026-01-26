function fn() {
  var env = karate.env || 'local';

  var config = {
    baseUrl: 'http://localhost:8080',
    kafka: {
      bootstrap: 'localhost:9092',
    }
  };

  if (env === 'docker') {
    config.baseUrl = 'http://api-gateway:8080';
    config.kafka.bootstrap = 'kafka:9092';
  }

  return config;
}
