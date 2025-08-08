# Self Claim Link System

A modern web application for automating virtual product delivery through self-service claim links. Built with Next.js, TypeScript, and SQLite.

## Features

### Customer Features
- **Simple Claim Process**: Customers enter their Shopee order ID to claim products
- **Instant Delivery**: Immediate access to download links after successful claim
- **Multiple Downloads**: Support for multiple download links per product
- **Responsive Design**: Works on desktop and mobile devices

### Admin Features
- **Product Management**: Add, edit, and manage virtual products
- **Order Management**: Create orders and link them to products
- **Flexible Settings**: Configure expiration dates and one-time use per order
- **Dashboard**: Real-time overview of all orders and products
- **Secure Authentication**: Admin login with JWT tokens

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite
- **Authentication**: JWT with bcrypt
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 3. Access Admin Panel

Navigate to `http://localhost:3000/admin/login`

**Default credentials:**
- Username: `admin`
- Password: `password`

## Usage Guide

### For Customers

1. **Receive Claim Link**: Get the self-claim link from the seller
2. **Enter Order ID**: Input your Shopee order ID
3. **Claim Product**: Click "Claim Product" to receive download links
4. **Download**: Access your virtual products immediately

### For Admins

#### Adding Products
1. Login to admin panel
2. Go to "Products" tab
3. Click "Add Product"
4. Fill in product details:
   - Product name
   - Description (optional)
   - Download links (one per line)
   - Image URL (optional)

#### Creating Orders
1. Go to "Orders" tab
2. Click "Create Order"
3. Enter customer's Shopee order ID
4. Select the purchased product
5. Configure expiration and one-time use settings
6. Submit to create the order

#### Sharing with Customers
- Share the main URL (`http://localhost:3000`) with customers
- They can enter their order ID to claim their products

## Database Schema

### Products Table
- `id`: Primary key
- `name`: Product name
- `description`: Product description
- `download_links`: JSON string of download URLs
- `image_url`: Product image URL
- `created_at`: Creation timestamp

### Orders Table
- `id`: Primary key
- `order_id`: Shopee order ID (unique)
- `product_id`: Foreign key to products
- `claim_status`: 'claimed' or 'unclaimed'
- `claim_timestamp`: When product was claimed
- `expiration_date`: Order expiration date
- `one_time_use`: Boolean flag
- `created_by`: Admin who created the order
- `created_at`: Creation timestamp

### Settings Table
- `key`: Setting name
- `value`: Setting value
- `updated_at`: Last update timestamp

## API Endpoints

### Customer Endpoints
- `POST /api/claim` - Claim a product using order ID

### Admin Endpoints
- `POST /api/auth/login` - Admin authentication
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order

## Security Features

- **JWT Authentication**: Secure admin access
- **One-time Use**: Prevent multiple claims of same order
- **Expiration Dates**: Automatic order expiration
- **Input Validation**: Server-side validation of all inputs
- **SQL Injection Protection**: Parameterized queries

## Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Create a `.env.local` file:
```
JWT_SECRET=your-secret-key-here
```

## Customization

### Changing Default Settings
Edit the database initialization in `lib/database.ts`:
- Default expiration days
- One-time use settings
- Admin credentials

### Styling
Modify `tailwind.config.js` to customize colors and styling.

### Adding Features
The modular structure makes it easy to add:
- Email notifications
- Analytics tracking
- Bulk order import
- Advanced product categories

## Troubleshooting

### Common Issues

1. **Database not created**: The SQLite database is created automatically on first run
2. **Login issues**: Default credentials are admin/password
3. **Port conflicts**: Change port in package.json scripts if needed

### Development Tips

- Use browser dev tools to inspect API responses
- Check browser console for client-side errors
- Monitor server logs for backend issues

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please check the troubleshooting section or create an issue in the repository.
