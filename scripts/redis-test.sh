#!/bin/bash

# Redis Test Container Management Script

case "$1" in
    "start")
        echo "Starting Redis test container..."
        docker-compose up -d
        echo "Redis container started on port 6380"
        echo "Password: testpassword123"
        echo ""
        echo "To connect with redis-cli:"
        echo "redis-cli -h localhost -p 6380 -a testpassword123"
        echo ""
        echo "To view logs:"
        echo "docker-compose logs -f redis"
        ;;
    "stop")
        echo "Stopping Redis test container..."
        docker-compose down
        echo "Redis container stopped"
        ;;
    "restart")
        echo "Restarting Redis test container..."
        docker-compose restart
        echo "Redis container restarted"
        ;;
    "logs")
        docker-compose logs -f redis
        ;;
    "shell")
        echo "Connecting to Redis container shell..."
        docker exec -it redis-heatmap-test redis-cli -a testpassword123
        ;;
    "reset")
        echo "Resetting Redis container (removing data)..."
        docker-compose down -v
        docker-compose up -d
        echo "Redis container reset and restarted"
        ;;
    "status")
        echo "Redis container status:"
        docker-compose ps
        echo ""
        echo "Container logs (last 10 lines):"
        docker-compose logs --tail=10 redis
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|shell|reset|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the Redis test container"
        echo "  stop    - Stop the Redis test container"
        echo "  restart - Restart the Redis test container"
        echo "  logs    - Show Redis container logs"
        echo "  shell   - Connect to Redis CLI inside container"
        echo "  reset   - Reset container and data"
        echo "  status  - Show container status and recent logs"
        echo ""
        echo "Connection details:"
        echo "  Host: localhost"
        echo "  Port: 6380"
        echo "  Password: testpassword123"
        ;;
esac
