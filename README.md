# Redis Keyspace Heatmap

A self-hosted web application that safely scans Redis instances to visualize memory usage patterns, key expiration times, and identify potential memory leaks.

## Features

- 🔍 **Safe Redis Scanning**: Bounded SCAN operations with configurable sample limits
- 📊 **Interactive Heatmaps**: Visualize TTL and idle-time patterns across key prefixes
- 🏗️ **Prefix Tree Analysis**: Aggregate metrics by key prefixes (e.g., `app:user:*`)
- 📈 **Memory Usage Tracking**: Size estimation with MEMORY USAGE and heuristic fallbacks
- ⚡ **Live Mode**: Real-time updates via Redis keyspace notifications
- 🛠️ **Operator Actions**: Safe key operations (expire, persist, delete) with guardrails
- 🔧 **Multi-Support**: Standalone Redis, Redis Cluster, and Redis Sentinel

## Quick Start

### Prerequisites

- Node.js 18+ 
- Redis instance (local or remote)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd redis-heatmap
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
# Create .env.local file
cat > .env.local << EOF
# Basic Authentication (optional in development)
# DASH_USER=admin
# DASH_PASS=change-me

# Key delimiter for prefix extraction
KEY_DELIMITER=:

# Operator mode (enable/disable key operations)
OPERATOR_MODE=true

# Redis connections (JSON array)
CONNECTIONS_JSON='[{"id":"local","name":"Local Redis","kind":"standalone","host":"127.0.0.1","port":6379}]'

# Development settings
NODE_ENV=development
EOF
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DASH_USER` | Basic auth username | - |
| `DASH_PASS` | Basic auth password | - |
| `KEY_DELIMITER` | Key prefix delimiter | `:` |
| `OPERATOR_MODE` | Enable key operations | `true` |
| `CONNECTIONS_JSON` | Redis connection profiles | Local Redis |

### Redis Connection Profiles

The `CONNECTIONS_JSON` environment variable accepts an array of connection profiles:

```json
[
  {
    "id": "local",
    "name": "Local Redis",
    "kind": "standalone",
    "host": "127.0.0.1",
    "port": 6379,
    "password": "optional-password",
    "db": 0
  },
  {
    "id": "cluster",
    "name": "Redis Cluster",
    "kind": "cluster",
    "clusterHosts": [
      {"host": "node1", "port": 7000},
      {"host": "node2", "port": 7000}
    ],
    "password": "cluster-password"
  }
]
```

## Usage

### Basic Workflow

1. **Connect to Redis**: Select a Redis instance from the connection dropdown
2. **Configure Scan**: Set sample limits and scan parameters
3. **Run Scan**: Click "Start Scan" to begin analysis
4. **Explore Results**: View heatmaps, prefix tables, and top keys
5. **Take Action**: Use operator tools to manage keys (if enabled)

### Understanding the Visualizations

#### TTL Heatmap
- **Rows**: Key prefixes (e.g., `app:user`, `cache:product`)
- **Columns**: TTL buckets (0-60s, 1-5m, 5-30m, etc.)
- **Color Intensity**: Number of keys or memory usage percentage
- **Red Zones**: Persistent keys (no TTL) - potential memory leaks

#### Idle Time Heatmap
- **Rows**: Key prefixes
- **Columns**: Idle time buckets (0-1m, 1-5m, 5-60m, etc.)
- **Color Intensity**: Number of keys in each idle bucket
- **Insights**: Identify hot vs cold data patterns

#### Prefix Table
- **Count**: Number of keys in prefix
- **Memory**: Estimated memory usage
- **% Persistent**: Percentage of keys without TTL
- **% Expiring <5m**: Percentage of keys expiring soon

### Operator Actions

When `OPERATOR_MODE=true`, you can:

- **EXPIRE**: Set TTL on persistent keys
- **PERSIST**: Remove TTL from expiring keys  
- **DELETE**: Remove individual keys
- **Pattern Delete**: Bulk delete with dry-run preview and rate limiting

## Architecture

### Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, ioredis client
- **Visualization**: D3.js for heatmaps
- **Real-time**: Server-Sent Events (SSE)

### Core Components

- **Scan Engine**: Bounded SCAN with pipelined metadata collection
- **Size Estimation**: MEMORY USAGE with heuristic fallbacks
- **Prefix Aggregation**: Tree-based key pattern analysis
- **Live Mode**: Keyspace notification subscription

## Development

### Project Structure

```
src/
├── app/
│   ├── (dash)/           # Dashboard pages
│   └── api/              # API routes
├── components/
│   ├── ui/               # shadcn/ui components
│   └── ...               # Custom components
├── lib/
│   ├── redis/            # Redis client management
│   ├── scan/             # Scanning and aggregation
│   ├── live/             # Real-time features
│   └── auth/             # Authentication
└── types.ts              # TypeScript definitions
```

### Running Tests

```bash
npm run test
```

### Building for Production

```bash
npm run build
npm start
```

## Docker Deployment

### Quick Demo with Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - CONNECTIONS_JSON='[{"id":"local","name":"Local Redis","kind":"standalone","host":"redis","port":6379}]'
    depends_on:
      - redis
```

```bash
docker-compose up -d
```

## Security Considerations

- **Authentication**: Basic auth via environment variables
- **Operator Mode**: Can be disabled to prevent key modifications
- **Rate Limiting**: Built-in limits on destructive operations
- **Dry-Run**: Pattern deletes always show preview first
- **No Value Export**: Only metadata is exported, never key values

## Performance

- **Scan Performance**: Default 50k sample limit, completes in <3s
- **Memory Usage**: <250MB peak for large samples
- **Live Updates**: <50 events/sec with debouncing
- **Cluster Support**: Parallel scanning across master nodes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the [documentation](docs/)
- Open an issue on GitHub
- Review the [PRD](redis_keyspace_heatmap_prd_v_1.md) for detailed specifications
