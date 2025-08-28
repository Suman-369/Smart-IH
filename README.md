# SecureReport


## Features

- **User Registration**: Secure user registration with email verification
- **OTP Verification**: 6-digit OTP sent via email for account verification
- **User Authentication**: JWT-based authentication system
- **Report Management**: Users can submit and manage reports
- **Admin Dashboard**: Admin interface for managing reports
- **Responsive Design**: Modern, mobile-friendly UI

## Tech Stack

### Backend

- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Nodemailer** for email services
- **bcryptjs** for password hashing

### Frontend

- **HTML5** with modern CSS
- **Vanilla JavaScript** (ES6+)
- **Font Awesome** for icons
- **Google Fonts** (Inter)

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js    # Authentication logic
│   │   │   └── reportController.js  # Report management
│   │   ├── models/
│   │   │   ├── user.model.js        # User schema
│   │   │   └── Report.js            # Report schema
│   │   ├── routes/
│   │   │   ├── auth.js              # Auth routes
│   │   │   └── report.js            # Report routes
│   │   ├── services/
│   │   │   ├── email.service.js     # Email service
│   │   │   └── storage.service.js   # File storage
│   │   ├── middleware/
│   │   │   └── auth.js              # Authentication middleware
│   │   ├── db/
│   │   │   └── db.js                # Database connection
│   │   └── app.js                   # Express app configuration
│   ├── server.js                    # Server entry point
│   └── package.json
├── frontend/
│   ├── js/
│   │   ├── auth.js                  # Authentication logic
│   │   ├── otp-verification.js      # OTP verification
│   │   ├── main.js                  # Main JavaScript
│   │   ├── user-dashboard.js        # User dashboard
│   │   └── admin-dashboard.js       # Admin dashboard
│   ├── styles/
│   │   └── main.css                 # Main stylesheet
│   ├── index.html                   # Landing page
│   ├── login.html                   # Login page
│   ├── register.html                # Registration page
│   ├── verify-otp.html              # OTP verification page
│   ├── user-dashboard.html          # User dashboard
│   └── admin-dashboard.html         # Admin dashboard
└── README.md
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user and send OTP
- `POST /auth/verify-otp` - Verify OTP and activate account
- `POST /auth/login` - User login

### Reports

- `GET /api/reports` - Get user's reports
- `POST /api/reports` - Submit new report
- `GET /api/reports/all` - Get all reports (admin)

## User Flow

1. **Registration**: User fills registration form
2. **OTP Generation**: System generates 6-digit OTP and sends via email
3. **Email Verification**: User enters OTP on verification page
4. **Account Activation**: Account is activated upon successful OTP verification
5. **Login**: User can now login with email and password
6. **Dashboard**: Access to user dashboard and report management

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or cloud instance)
- Gmail account for email service

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd SIH2
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Set up environment variables**

   - Copy `ENV_SETUP.md` instructions
   - Create `.env` file in backend directory
   - Configure email and database settings

4. **Start the server**

   ```bash
   npm start
   # or for development
   npm run dev
   ```

5. **Access the application**
   - Open `http://localhost:3000` in your browser
   - The frontend is served by the backend server

## Environment Variables

See `backend/ENV_SETUP.md` for detailed setup instructions.

Required variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `MAIL_USER` - Gmail address for sending emails
- `MAIL_PASS` - Gmail app password

## Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: Stateless authentication tokens
- **Email Verification**: OTP-based account verification
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured CORS headers
- **Rate Limiting**: Built-in request limiting

## Development

### Running in Development Mode

```bash
cd backend
npm run dev
```

### File Structure Notes

- Frontend files are served statically by the backend
- All API routes are prefixed with `/api` or `/auth`
- Static files are served from the `frontend` directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
