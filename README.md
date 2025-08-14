# Cardomat - Digital Loyalty Card Wallet Backend

A secure and scalable backend service for a mobile app that allows users to store all their loyalty cards in one digital wallet, eliminating the need to carry physical cards.

## 🚀 Features

- **Digital Wallet**: Store unlimited loyalty cards in encrypted format
- **Multi-Device Sync**: Access cards across iOS, Android, and web devices
- **Barcode Support**: Support for multiple barcode formats (Code 128, Code 39, QR codes, EAN13, UPC, PDF417)
- **Secure Storage**: AES-256 encryption for sensitive card data
- **RESTful API**: Clean, documented API for mobile and web applications
- **JWT Authentication**: Secure token-based authentication
- **Usage Analytics**: Track card usage patterns
- **Device Management**: Register and manage multiple devices per user

## 🏗️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for sessions and rate limiting
- **Security**: JWT tokens, bcrypt password hashing, AES-256 encryption
- **Validation**: Joi schema validation
- **Testing**: Jest with TypeScript
- **Containerization**: Docker with multi-stage builds
- **Documentation**: Inline code documentation and API specs

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Redis 6+
- Docker (optional, for containerized deployment)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/kipuris/cardomat.git
   cd cardomat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and Redis configuration
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb loyalty_wallet
   
   # Run schema
   psql loyalty_wallet < database/schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Docker Deployment

1. **Using Docker Compose (recommended)**
   ```bash
   docker-compose up -d
   ```

2. **Building manually**
   ```bash
   docker build -t loyalty-wallet-backend .
   docker run -p 3000:3000 loyalty-wallet-backend
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "phone": "+1234567890",
  "device_id": "unique-device-id",
  "device_name": "iPhone 14 Pro",
  "device_type": "ios",
  "push_token": "optional-push-token"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "device_id": "unique-device-id",
  "device_name": "iPhone 14 Pro",
  "device_type": "ios"
}
```

### Loyalty Card Endpoints

#### Get All Cards
```http
GET /cards
Authorization: Bearer {jwt_token}
```

#### Create Card
```http
POST /cards
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "card_name": "Starbucks Rewards",
  "store_name": "Starbucks",
  "card_number": "6396 7754 1234 5678",
  "barcode_type": "code128",
  "barcode_data": "639677541234567890",
  "card_color": "#00704A",
  "notes": "Gold level member",
  "is_favorite": true
}
```

#### Get Card for Display
```http
GET /cards/{cardId}/display
Authorization: Bearer {jwt_token}
```

### API Key Authentication

For server-to-server communication, you can use API keys:

```http
GET /cards
X-API-Key: your-api-key-here
```

## 🔒 Security Features

- **Data Encryption**: All sensitive card data is encrypted using AES-256
- **Password Security**: bcrypt hashing with salt rounds
- **JWT Tokens**: Secure, stateless authentication
- **Input Validation**: Comprehensive request validation using Joi
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **Rate Limiting**: Redis-based rate limiting (planned)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## 🚦 Health Checks

The service provides health check endpoints for monitoring:

- `GET /health` - Basic health check
- Includes database connectivity test
- Container-friendly health checks in Docker

## 📊 Database Schema

The database includes the following main tables:

- **users**: User accounts and authentication
- **user_devices**: Multi-device support and push notifications
- **loyalty_cards**: Encrypted loyalty card storage
- **card_usage_logs**: Analytics and usage tracking
- **store_locations**: Geolocation data for Card Assist feature
- **offers**: Promotional offers and coupons
- **api_keys**: API key management
- **audit_logs**: Security and compliance auditing

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `loyalty_wallet` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `ENCRYPTION_KEY` | AES encryption key | (required) |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3001` |

## 🚀 Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET` and `ENCRYPTION_KEY`
- [ ] Configure proper database credentials
- [ ] Set up SSL/TLS certificates
- [ ] Configure production CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure automatic backups
- [ ] Review security headers and policies

### AWS Deployment

The application is designed to work with:
- **ECS/Fargate**: Container orchestration
- **RDS PostgreSQL**: Managed database
- **ElastiCache Redis**: Managed cache
- **ALB**: Application Load Balancer
- **CloudWatch**: Logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:

- 📧 Email: support@cardomat.com
- 📚 Documentation: [Project Wiki](link-to-wiki)
- 🐛 Issues: [GitHub Issues](https://github.com/kipuris/cardomat/issues)

---

**Built with ❤️ for the digital wallet revolution**