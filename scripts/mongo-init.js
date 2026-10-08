db = db.getSiblingDB('sda_training');

db.createCollection('docker_initialization');

db.docker_initialization.insertOne({
  initialized: true,
  initializedAt: new Date(),
  source: 'day16-docker-compose'
});