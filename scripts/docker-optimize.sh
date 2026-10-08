#!/bin/bash

echo "🐳 Docker Optimization Script"
echo "=============================="

echo "🧹 Cleaning up unused Docker resources..."
docker system prune -f
docker volume prune -f
docker network prune -f

echo "🏗️ Building optimized image..."
docker build --target runner -t sda-training:latest .

echo "📊 Analyzing image size..."
docker images sda-training:latest

echo "🔒 Running security scan..."
if docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image sda-training:latest; then
    echo "✅ Security scan completed."
else
    echo "⚠️ Trivy scan could not be completed."
fi

echo "⚡ Running performance test..."
docker run --rm -d --name perf-test sda-training:latest

sleep 10

docker stats perf-test --no-stream

docker stop perf-test

echo "✅ Optimization complete!"