CREATE TABLE IF NOT EXISTS docker_initialization (
    id SERIAL PRIMARY KEY,
    initialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(100) NOT NULL DEFAULT 'day16-docker-compose'
);

INSERT INTO docker_initialization (source)
VALUES ('day16-docker-compose');