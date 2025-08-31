# 🏗️ Windows Build Guide - Tally MongoDB Field Mapper

## 📋 Prerequisites

### Required Software
- **Node.js 18+** (https://nodejs.org/)
- **Git** (https://git-scm.com/)
- **Windows 10/11** (64-bit)
- **Visual Studio Build Tools** or **Visual Studio 2019/2022**

### Optional (for advanced builds)
- **Python 3.8+** (for native module compilation)
- **Windows SDK** (latest version)

## 🚀 Quick Build Instructions

### Step 1: Setup Environment
```bash
# Extract the source package
# Open PowerShell or Command Prompt as Administrator

# Navigate to extracted folder
cd "C:\path\to\extracted\tally-mongodb-mapper"

# Install dependencies
npm install

# Install electron-builder globally (optional)
npm install -g electron-builder
```

### Step 2: Development Mode (Test First)
```bash
# Run in development mode to test
npm run dev

# App will open at http://localhost:5173/
# Test all features before building
```

### Step 3: Build for Production
```bash
# Build the React app
npm run build

# Build Windows executable
npm run dist

# Or build specific Windows target
npx electron-builder --win --x64
```

### Step 4: Find Your Build
```bash
# Built files will be in:
release/
├── win-unpacked/              # Unpacked Windows app
│   └── Tally Field Extractor.exe
└── Tally Field Extractor Setup 0.0.0.exe  # Installer (if configured)
```

## 📦 Build Outputs

### Available Build Commands
```bash
npm run dev          # Development mode with hot reload
npm run build        # Build React app for production
npm run dist         # Build Windows executable
npm run electron     # Run electron with built app
```

### Build Variations
```bash
# Portable executable (no installer)
npx electron-builder --win --x64 --dir

# With installer
npx electron-builder --win --x64

# Different architectures
npx electron-builder --win --ia32    # 32-bit
npx electron-builder --win --arm64   # ARM64
```

## 🔧 Configuration Files

### Key Files to Understand
- **package.json**: Dependencies, scripts, electron-builder config
- **vite.config.ts**: Frontend build configuration
- **electron.cjs**: Main electron process
- **preload.cjs**: Electron preload script
- **src/**: All React/TypeScript source code

### MongoDB Integration Files
- **src/services/api/mongodb/**: MongoDB service layer
- **src/services/config/**: Configuration management
- **src/services/storage/**: Cross-platform storage
- **src/components/**: UI components for MongoDB features

## 🐛 Troubleshooting

### Common Build Issues

#### 1. Node-gyp Build Errors
```bash
# Install windows build tools
npm install --global windows-build-tools

# Or install Visual Studio Build Tools manually
# https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
```

#### 2. MongoDB Native Dependencies
```bash
# If MongoDB driver fails to install
npm install mongodb --no-optional

# Or rebuild native modules
npm rebuild
```

#### 3. Electron Build Fails
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules
npm install

# Try different electron-builder version
npm install electron-builder@24.13.3 --save-dev
```

#### 4. Windows Defender/Antivirus Issues
```bash
# Add build folder to antivirus exclusions:
# - Your project folder
# - %APPDATA%/npm
# - %TEMP%
```

### Permission Issues
```bash
# Run PowerShell as Administrator for first build
# Set execution policy if needed:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## ⚙️ Build Customization

### Change App Name/Version
Edit `package.json`:
```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "build": {
    "productName": "Your App Name",
    "appId": "com.yourcompany.yourapp"
  }
}
```

### Add App Icon
1. Create icon files: `icon.ico`, `icon.png`
2. Place in `build/` folder
3. Update `package.json`:
```json
{
  "build": {
    "win": {
      "icon": "build/icon.ico"
    }
  }
}
```

### Code Signing (Optional)
```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.p12",
      "certificatePassword": "password"
    }
  }
}
```

## 🧪 Testing Your Build

### Before Distribution
1. **Test MongoDB Connection**: Use real MongoDB instance
2. **Test Tally Connection**: Connect to actual Tally server
3. **Test Field Mapping**: Try various field combinations
4. **Test Sync Process**: Verify data writes correctly
5. **Test Error Handling**: Simulate connection failures

### Performance Testing
```bash
# Monitor during sync
# - Memory usage
# - CPU usage
# - Network activity
# - Disk I/O
```

## 📁 Project Structure

```
source-package/
├── src/
│   ├── components/          # UI Components
│   │   ├── MongoConfig.tsx     # MongoDB configuration
│   │   ├── FieldMapping.tsx    # Field mapping interface  
│   │   └── SyncInterface.tsx   # Sync control panel
│   ├── services/           # Business Logic
│   │   ├── api/               # API services
│   │   ├── config/            # Configuration management
│   │   └── storage/           # Storage abstraction
│   ├── App.tsx             # Main React component
│   └── main.tsx           # React entry point
├── package.json           # Dependencies & build config
├── electron.cjs          # Electron main process
├── vite.config.ts        # Vite build config
└── Build guides & docs
```

## 🎯 Ready to Build!

Follow these steps and you'll have a fully functional Windows executable with:

✅ **MongoDB Integration**: Full connection and sync capabilities  
✅ **Dynamic Field Mapping**: Visual configuration interface  
✅ **Real-time Progress**: Live sync tracking  
✅ **Error Handling**: Comprehensive error management  
✅ **Cross-platform Storage**: Works in Electron and browser  

**Build Time**: ~5-10 minutes depending on your system  
**Output Size**: ~200-400 MB (includes Electron runtime)  
**Dependencies**: All included in package.json

---

**Good luck with your build! 🚀**