# Self-Claim-Link

A modern Next.js web application for digital product claiming system. Allows customers to claim and download digital products using Shopee order IDs with comprehensive admin management capabilities.

## 🚀 Features

### Customer Features
- **Order ID Claiming**: Enter Shopee order ID to claim digital products
- **Instant Downloads**: Get immediate access to download links after successful claim
- **Multi-Product Support**: Single order can contain multiple digital products
- **Claim Validation**: Automatic verification of order validity and expiration
- **Modern UI**: Clean, responsive interface with real-time feedback

### Admin Features
- **Product Management**: Add, edit, and delete digital products with download links
- **Order Management**: Create orders, assign products, set expiration dates
- **Claim Tracking**: Monitor claim status, timestamps, and usage counts
- **Flexible Settings**: Configure expiration periods and one-time use policies
- **Secure Authentication**: Protected admin dashboard with JWT authentication

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with connection pooling
- **Authentication**: bcryptjs, JWT
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/johnyww/self-claim-link-v2.git
   cd self-claim-link-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🗄️ Database Schema

The application automatically creates the following PostgreSQL tables on first run:

- **`products`**: Digital products with download links
- **`orders`**: Order tracking with claim status and expiration
- **`order_products`**: Junction table linking orders to products
- **`admins`**: Admin user authentication
- **`settings`**: System configuration

## 🔧 Configuration

### Default Admin Account
- **Username**: `admin`
- **Password**: `password`
- **Access**: Navigate to `/admin/login`

### Default Settings
- **Expiration Period**: 7 days
- **One-time Use**: Enabled by default

## 📁 Project Structure

```
self-claim-link/
├── app/
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx          # Admin login page
│   │   └── page.tsx              # Admin dashboard (25KB+)
│   ├── api/
│   │   ├── auth/
│   │   │   └── route.ts          # Authentication endpoint
│   │   ├── claim/
│   │   │   └── route.ts          # Core claiming logic
│   │   ├── orders/
│   │   │   └── route.ts          # Order management API
│   │   └── products/
│   │       └── route.ts          # Product management API
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main claiming interface
├── lib/
│   ├── database.ts               # PostgreSQL database setup
│   └── types.ts                  # TypeScript interfaces
├── .env                          # Environment configuration (PostgreSQL credentials)
├── package.json
└── README.md
```

## 🚦 Usage

### For Customers

1. **Get Order ID**: Receive order ID after purchasing digital products
2. **Visit Website**: Navigate to the main page
3. **Enter Order ID**: Input your Shopee order ID
4. **Claim Products**: Click "Claim Products" button
5. **Download**: Access download links for your digital products

### For Admins

1. **Login**: Access `/admin/login` with admin credentials
2. **Manage Products**: Add digital products with download links
3. **Create Orders**: Generate order IDs and assign products
4. **Monitor Claims**: Track claim status and usage statistics
5. **Configure Settings**: Adjust expiration periods and usage policies

## 🔐 Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: Secure admin session management
- **Order Validation**: Prevents unauthorized claims
- **Expiration Control**: Time-based access restrictions
- **One-time Use**: Configurable claim limitations

## 🎯 Business Logic

### Claim Process
1. **Order Lookup**: Verify order ID exists in database
2. **Expiration Check**: Ensure order hasn't expired
3. **Usage Validation**: Check one-time use restrictions
4. **Product Retrieval**: Fetch associated digital products
5. **Claim Recording**: Update claim status and count
6. **Download Generation**: Provide secure download links

### Order Management
- **Flexible Expiration**: Set custom expiration dates per order
- **Multi-Product Orders**: Associate multiple products with single order
- **Claim Tracking**: Monitor usage patterns and statistics
- **Status Management**: Track claimed/unclaimed/available states

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables

Create a `.env` file in the project root with your PostgreSQL configuration:

```env
# JWT Secret - Generate a secure random secret
JWT_SECRET=your-secure-jwt-secret-here

# PostgreSQL Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# PostgreSQL Connection Details
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=self_claim_db
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password

# Admin Configuration
FORCE_ADMIN_PASSWORD_CHANGE=true
DEFAULT_ADMIN_USERNAME=admin

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
SESSION_TIMEOUT_HOURS=24
```

### PostgreSQL Setup

1. **Install PostgreSQL** on your system
2. **Create a database** for the application:
   ```sql
   CREATE DATABASE self_claim_db;
   ```
3. **Configure your `.env` file** with your PostgreSQL credentials
4. **Start the application** - tables will be created automatically

## 📊 API Endpoints

- **POST** `/api/claim` - Claim products with order ID
- **GET/POST** `/api/products` - Manage digital products
- **GET/POST** `/api/orders` - Manage orders
- **POST** `/api/auth` - Admin authentication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using Next.js and modern web technologies.
