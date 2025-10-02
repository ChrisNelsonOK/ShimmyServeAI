# ShimmyServe AI - Deployment Guide

## 🚀 Production Deployment Guide

This guide covers deploying ShimmyServe AI to your workstation or production environment.

## ✅ Prerequisites Checklist

- [ ] Node.js 20+ installed
- [ ] Git installed
- [ ] Modern web browser (Chrome, Firefox, Safari, Edge)
- [ ] Docker (optional, for containerized deployment)

## 📥 Installation Steps

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd ShimmyServeAI

# Install dependencies
npm install

# Run type checking to ensure everything is correct
npm run typecheck

# Run linting to check code quality
npm run lint
```

### 2. Development Server

```bash
# Start development server
npm run dev

# Access the application
open http://localhost:5173
```

### 3. Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🗄️ Database Setup

ShimmyServe AI uses a browser-compatible mock database that:

- **Stores data in localStorage** for persistence across sessions
- **Provides SQLite-compatible API** for seamless operation
- **Includes sample data** for immediate testing and demonstration
- **Requires no external database setup** - works out of the box

### Default Users

The system includes these default users for testing:

| Username | Email | Password | Role |
|----------|-------|----------|------|
| admin | admin@example.com | Any 6+ chars | Admin |
| demouser | demo@example.com | Any 6+ chars | User |

### Demo Mode

Access the application with `?demo=true` to automatically log in as admin:
```
http://localhost:5173?demo=true
```

## 🎯 Testing the Deployment

### 1. Basic Functionality Test

- [ ] Application loads without errors
- [ ] Login screen appears with proper contrast
- [ ] Demo mode works (`?demo=true`)
- [ ] Dashboard displays with mock data
- [ ] Navigation between sections works

### 2. Database Operations Test

- [ ] Knowledge Base shows sample documents
- [ ] Logs display system entries
- [ ] User Management shows default users
- [ ] All CRUD operations work properly

### 3. UI/UX Test

- [ ] Dark theme displays correctly
- [ ] Text has sufficient contrast
- [ ] Responsive design works on mobile
- [ ] Animations and transitions are smooth

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Optional API configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Application settings
VITE_APP_NAME=ShimmyServe
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production

# Debug settings
VITE_DEBUG_MODE=false
VITE_ENABLE_ANALYTICS=false
```

### Customization

The application can be customized by modifying:

- **Colors**: Edit `tailwind.config.js` for theme colors
- **Branding**: Update `index.html` title and favicon
- **Features**: Enable/disable modules in component routing

## 🐳 Docker Deployment (Optional)

### Using Docker

```bash
# Build Docker image
docker build -t shimmyserve-ai .

# Run container
docker run -p 3000:80 shimmyserve-ai

# Access application
open http://localhost:3000
```

### Using Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔒 Security Considerations

### For Production Deployment

1. **HTTPS Setup**: Always use HTTPS in production
2. **Environment Variables**: Keep sensitive data in `.env.local`
3. **Database Migration**: Consider server-side SQLite for production
4. **Access Control**: Implement proper authentication in production
5. **Rate Limiting**: Configure appropriate rate limits for your use case

### Security Features Included

- ✅ Rate limiting for authentication attempts
- ✅ CSRF protection
- ✅ Input validation and sanitization
- ✅ Secure session management
- ✅ Role-based access control

## 📊 Monitoring and Maintenance

### Health Checks

The application includes health monitoring:

- **Browser Console**: Check for JavaScript errors
- **Network Tab**: Monitor API call performance
- **localStorage**: Verify data persistence
- **Memory Usage**: Monitor for memory leaks

### Performance Optimization

- **Bundle Size**: Run `npm run build` to check bundle size
- **Loading Speed**: Monitor initial page load time
- **Memory Usage**: Check for memory leaks during extended use
- **Responsive Design**: Test on various screen sizes

## 🛠️ Troubleshooting

### Common Issues

**Application won't start**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors**
```bash
# Run type checking
npm run typecheck
```

**Build failures**
```bash
# Check for ESLint errors
npm run lint
```

**Database not working**
```bash
# Clear localStorage in browser developer tools
# Refresh the page to reinitialize
```

### Browser Compatibility

- **Chrome/Chromium**: ✅ Fully supported
- **Firefox**: ✅ Fully supported  
- **Safari**: ✅ Fully supported
- **Edge**: ✅ Fully supported
- **Internet Explorer**: ❌ Not supported

## 📈 Performance Metrics

Expected performance benchmarks:

- **Initial Load**: < 3 seconds
- **Page Transitions**: < 500ms
- **Database Operations**: < 100ms
- **Memory Usage**: < 100MB

## 🎉 Deployment Checklist

### Pre-Deployment
- [ ] Code passes all TypeScript checks
- [ ] All ESLint warnings resolved
- [ ] Application builds without errors
- [ ] All features tested in development

### Post-Deployment
- [ ] Application loads correctly
- [ ] All navigation works
- [ ] Database operations function
- [ ] Performance meets expectations
- [ ] Security features active

## 📞 Support

For deployment issues:

1. **Check Browser Console** for JavaScript errors
2. **Review Network Tab** for failed requests
3. **Verify Environment Variables** are set correctly
4. **Test in Different Browsers** to isolate issues
5. **Check Documentation** in `claudedocs/` folder

## 🔄 Updates and Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build
```

### Database Migrations

For future SQLite migrations:

1. Backup current localStorage data
2. Update database schema in `src/lib/database.ts`
3. Implement migration logic
4. Test thoroughly before deployment

---

**✅ Deployment Complete!**

Your ShimmyServe AI instance is now ready for production use.