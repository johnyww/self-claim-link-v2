# Self-Claim-Link v2

A modern, secure digital product delivery system that allows customers to claim and download virtual products using Shopee order IDs. Built with Next.js 15, PostgreSQL, and comprehensive admin management capabilities.

## 🚀 Features

### Customer Features
- **Order ID Claiming**: Simple interface for customers to claim products using Shopee order IDs
- **Instant Downloads**: Immediate access to digital products after successful claim
- **Multi-Product Support**: Single orders can contain multiple digital products
- **Expiration Control**: Orders can have configurable expiration dates
- **One-time/Multi-use**: Flexible claiming restrictions per order
- **Modern UI**: Responsive design with real-time feedback

### Admin Features
- **Comprehensive Dashboard**: Tabbed interface for managing all aspects of the system
- **Product Management**: Full CRUD operations with image and description support
- **Order Management**: Create and manage orders with flexible configurations
- **Claim Tracking**: Monitor claim status and usage statistics
- **Settings Management**: Configure system defaults and preferences
- **Admin User Management**: Secure admin account creation and password management

### Security Features
- **JWT Authentication**: Secure token-based authentication with configurable expiration
- **Password Security**: bcrypt hashing with configurable rounds
- **Rate Limiting**: General and strict rate limiting for sensitive endpoints
- **Account Lockout**: Automatic lockout after failed login attempts
- **Input Validation**: Comprehensive validation and sanitization
- **SQL Injection Protection**: Parameterized queries throughout

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, PostgreSQL with connection pooling
- **Authentication**: JWT, bcryptjs
- **Database**: PostgreSQL with automated schema initialization
- **Logging**: Winston with structured logging
- **Monitoring**: Sentry integration for error tracking
- **Deployment**: Docker with multi-stage builds, Docker Compose
- **Testing**: Jest, Playwright for E2E testing

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- Docker & Docker Compose (for containerized deployment)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/johnyww/self-claim-link-v2.git
   cd self-claim-link-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # JWT Secret - Generate with: openssl rand -base64 32
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   
   # PostgreSQL Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/self_claim_db
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=self_claim_db
   POSTGRES_USER=username
   POSTGRES_PASSWORD=password
   
   # Admin Configuration
   DEFAULT_ADMIN_USERNAME=admin
   DEFAULT_ADMIN_PASSWORD=password
   FORCE_ADMIN_PASSWORD_CHANGE=true
   
   # Security Settings
   BCRYPT_ROUNDS=12
   SESSION_TIMEOUT_HOURS=24
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   STRICT_RATE_LIMIT_WINDOW_MS=900000
   STRICT_RATE_LIMIT_MAX_REQUESTS=10
   ```

4. **Database Setup**
   
   Create PostgreSQL database:
   ```bash
   createdb self_claim_db
   ```
   
   The application will automatically initialize the database schema on first run.

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   Access the application:
   - Customer interface: http://localhost:3000
   - Admin dashboard: http://localhost:3000/admin
   - Admin login: http://localhost:3000/admin/login

## 🐳 Docker Deployment

### Quick Start with Docker Compose

1. **Copy environment file**
   ```bash
   cp docker-compose.env.example docker-compose.env
   ```

2. **Configure environment variables** in `docker-compose.env`

3. **Start services**
   ```bash
   docker-compose up -d
   ```

This will start:
- Next.js application (port 3000)
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- Automated backup service

### Production Deployment

The Docker setup includes:
- **Multi-stage builds** for optimized image size
- **Health checks** for all services
- **Automated backups** with 7-day retention
- **Volume persistence** for data and logs
- **Non-root user** execution for security

## 📚 API Documentation

### Core Endpoints

#### Claim Products
```http
POST /api/claim
Content-Type: application/json

{
  "orderId": "SHOPEE_ORDER_ID"
}
```

#### Product Management
```http
GET    /api/products           # List all products
POST   /api/products           # Create product
PUT    /api/products           # Update product
DELETE /api/products?id=123    # Delete product
```

#### Order Management
```http
GET    /api/orders             # List all orders
POST   /api/orders             # Create order
PUT    /api/orders             # Update order
DELETE /api/orders?id=123      # Delete order
```

#### Authentication
```http
POST /api/auth/login           # Admin login
POST /api/auth/change-password # Change admin password
```

#### System
```http
GET /api/health                # Health check
GET /api/metrics               # System metrics
```

## 🗄 Database Schema

### Tables

- **products**: Digital products with download links and metadata
- **orders**: Order tracking with claim status and expiration
- **order_products**: Junction table linking orders to products
- **admins**: Admin user authentication with security tracking
- **settings**: System configuration storage

### Key Relationships

- Orders can contain multiple products (many-to-many)
- Products can be in multiple orders
- Admins have security tracking (failed logins, lockout status)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret (required in production) | - |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `POSTGRES_*` | Individual PostgreSQL connection parameters | - |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |
| `SESSION_TIMEOUT_HOURS` | JWT token expiration | 24 |
| `RATE_LIMIT_*` | Rate limiting configuration | Various |
| `SENTRY_DSN` | Error tracking (optional) | - |

### Security Configuration

- **Password Requirements**: Configurable min/max length
- **Rate Limiting**: Separate limits for general and sensitive endpoints
- **Account Lockout**: Automatic lockout after failed attempts
- **JWT Expiration**: Configurable session timeout

## 🧪 Testing

### Unit Tests
```bash
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### End-to-End Tests
```bash
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # Interactive E2E testing
```

## 📊 Monitoring & Logging

### Logging
- **Winston** structured logging
- **Log levels**: error, warn, info, debug
- **Log rotation** and retention
- **Performance metrics** tracking

### Error Tracking
- **Sentry integration** for production error monitoring
- **Health checks** for system monitoring
- **Metrics endpoints** for observability

## 🔒 Security

### Best Practices Implemented
- **Environment-based configuration** with validation
- **SQL injection protection** via parameterized queries
- **Rate limiting** to prevent abuse
- **Secure password hashing** with bcrypt
- **JWT token security** with proper expiration
- **Input validation** and sanitization
- **Account lockout** mechanisms

### Production Security Checklist
- [ ] Generate strong JWT secret
- [ ] Configure proper database credentials
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Enable logging and monitoring
- [ ] Set up automated backups
- [ ] Review and update dependencies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style
- Ensure security considerations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in the `/docs` folder
- Review the API endpoints and examples

## 🚀 Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Webhook integrations
- [ ] Mobile app support
- [ ] Advanced user roles and permissions

---

**Built with ❤️ using Next.js, PostgreSQL, and modern web technologies.**
