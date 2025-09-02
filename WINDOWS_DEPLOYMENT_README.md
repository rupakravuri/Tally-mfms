# Tally Field Extractor - Windows Deployment Guide

## 🚀 Quick Start for Windows

This application has been **fully tested** and all MongoDB connection issues have been **resolved**. You can now deploy it on Windows with confidence.

### Prerequisites
- **Node.js 16+** (Download from https://nodejs.org/)
- **Git** (Download from https://git-scm.com/)
- **MongoDB** (Optional - for local testing)

### Installation Steps

1. **Extract the ZIP file**
   ```bash
   # Extract to desired location, e.g., C:\TallyFieldExtractor
   ```

2. **Install Dependencies**
   ```bash
   cd TallyFieldExtractor
   npm install
   ```

3. **Build the Application**
   ```bash
   npm run build
   ```

4. **Run in Development Mode**
   ```bash
   npm run electron-dev
   ```

5. **Build Windows Executable**
   ```bash
   npm run dist
   ```
   The `.exe` file will be created in the `release` folder.

## 🔧 MongoDB Connection - ISSUES FIXED!

### ✅ Fixed Issues
1. **Configuration Not Saving** - Now works reliably on Windows
2. **External MongoDB Connection Validation** - Proper timeout handling and error messages

### Supported MongoDB Configurations
- ✅ **Local MongoDB**: `mongodb://localhost:27017`
- ✅ **Remote MongoDB**: `mongodb://192.168.1.100:27017`
- ✅ **MongoDB Atlas**: `mongodb+srv://user:pass@cluster.mongodb.net/db`
- ✅ **Authenticated**: `mongodb://user:pass@host:27017/db?authSource=admin`

### Configuration Location
- Windows: `%USERPROFILE%\.tally-field-extractor\config\mongodb-config.json`

## 🏗️ Build Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run electron` | Run Electron app |
| `npm run electron-dev` | Run in development mode |
| `npm run dist` | Build Windows executable |

## 📋 Application Features

### 🏢 Company Selection
- Connect to Tally ERP servers (local or remote)
- Automatic company discovery
- Real-time connection status

### 📋 Field Extraction
- **Sales Voucher Fields** (56+ fields)
- **Stock Item Fields** (80+ fields)
- Export to PDF, Excel, CSV

### 🔄 MongoDB Sync
- Real-time inventory sync from Tally to MongoDB
- Batch processing with progress tracking
- Error handling and retry mechanisms
- Field mapping configuration

## 🛠️ Troubleshooting

### Common Issues & Solutions

1. **"electron command not found"**
   ```bash
   npm install -g electron
   ```

2. **Build fails on Windows**
   ```bash
   npm install --platform=win32
   npm run build
   ```

3. **MongoDB connection fails**
   - Check if MongoDB is running
   - Verify connection string format
   - Check firewall settings

4. **Tally connection fails**
   - Ensure Tally is running with XML server enabled
   - Check port 9000 accessibility
   - Verify server IP address

## 📞 Support

### Application Structure
```
TallyFieldExtractor/
├── src/
│   ├── components/          # React components
│   ├── services/           # API and MongoDB services
│   └── modules/            # Feature modules
├── electron.cjs            # Electron main process
├── preload.cjs            # Electron preload script
└── dist/                  # Built application
```

### Key Files (MongoDB Fixes Applied)
- `src/services/storage/storageService.ts` - Fixed config persistence
- `src/services/config/mongoConfig.ts` - Enhanced connection handling
- `electron.cjs` - Improved main process MongoDB logic
- `src/components/MongoConfig.tsx` - MongoDB configuration UI

## 🎯 Production Ready

This version includes all MongoDB connection fixes:
- ✅ Reliable configuration saving
- ✅ External MongoDB server support
- ✅ MongoDB Atlas compatibility
- ✅ Enhanced error messages
- ✅ 30-second timeout for external connections
- ✅ Graceful connection handling

**Ready for production deployment on Windows!** 🚀