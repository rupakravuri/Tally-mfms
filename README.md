# Tally Field Extractor - Desktop Application

A simplified desktop application built with **Electron + React** that connects to Tally ERP servers to extract and display available fields in Sales Vouchers and Stock Items.

## 🚀 Quick Start

### For Users (Windows .exe)
1. Download the latest release
2. Run `Tally Field Extractor.exe`
3. Enter your Tally server details
4. Browse available fields!

### For Developers
```bash
# Clone the repository
git clone <repo-url>
cd tally-field-extractor

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build Windows executable
npm run dist
```

## ✨ Features

### 🏢 **Company Selection**
- Connect to any Tally server (localhost or remote)
- Automatic company discovery
- Real-time connection status

### 📋 **Sales Voucher Fields** (56+ Fields)
Complete field extraction including:
- Basic voucher information (GUID, NUMBER, DATE, TYPE)
- Party and address details (PARTYLEDGERNAME, ADDRESS)
- Amount and pricing (AMOUNT, RATE, DISCOUNT)
- Inventory details (STOCKITEMNAME, QUANTITY, GODOWN)
- GST information (HSNCODES, RATES, CALCULATIONS)
- Status flags (AUDITED, DELETED, OPTIONAL)

### 📦 **Stock Item Fields** (80+ Fields)
Comprehensive stock item information:
- Basic details (NAME, ALIAS, PARENT, CATEGORY)
- Pricing (SALES, PURCHASE, MRP, MINIMUM)
- Units of measurement (STOCK, PURCHASE, SALES UOM)
- Tax configuration (GST, VAT, EXCISE applicability)
- Inventory management (MIN, MAX, REORDER levels)
- Costing methods (FIFO, LIFO, AVERAGE)

### 🔄 **Real-time Monitoring**
- Connection status indicator
- Port 9000 connectivity check
- Automatic error detection
- Detailed error messages

## 🛠️ Technical Details

### Built With
- **Electron 33** - Desktop application framework
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool

### Architecture
- **Frontend**: React SPA with Tally API integration
- **Backend**: Direct XML API calls to Tally ERP
- **Desktop**: Electron wrapper for cross-platform support

### Tally Integration
- Uses Tally's XML API (port 9000)
- Supports all Tally Prime versions
- Real-time data fetching
- No data modification - read-only access

## 📊 Field Coverage

| Category | Fields Count | Examples |
|----------|--------------|----------|
| **Sales Vouchers** | 56+ | VOUCHERNUMBER, AMOUNT, GSTRATE, STOCKITEMNAME |
| **Stock Items** | 80+ | NAME, SALESPRICE, GSTAPPLICABLE, OPENINGBALANCE |

## 🔧 Configuration

### Default Settings
- **Server**: localhost:9000 (configurable)
- **Timeout**: 45 seconds
- **Protocol**: HTTP with XML POST requests

### Custom Server Setup
1. Launch the application
2. Select "Custom Server"
3. Enter your server IP:PORT
4. Click "Test Connection"

## 📦 Building from Source

### Prerequisites
- Node.js 16+
- Windows 10/11 (for .exe builds)

### Build Commands
```bash
# Development
npm run dev

# Production build
npm run build

# Windows executable
npm run dist

# Alternative build methods
npx electron-builder --win --x64
```

## 🚨 Troubleshooting

### Connection Issues
1. Ensure Tally is running with XML Server enabled
2. Check port 9000 accessibility
3. Verify firewall settings
4. Test with: `curl -X POST http://your-server:9000`

### Build Issues
1. Clear cache: `rm -rf node_modules dist release`
2. Reinstall: `npm install`
3. Rebuild: `npm run build && npm run dist`

## 📋 Use Cases

### For Developers
- **API Discovery**: Find all available Tally fields before integration
- **Documentation**: Generate field reference guides
- **Testing**: Verify Tally connectivity and data structure
- **Mapping**: Plan data transformation between systems

### For Business Users
- **Field Exploration**: Understand what data Tally can provide
- **Integration Planning**: Know available fields for reports/exports
- **Troubleshooting**: Verify Tally server connectivity

## 🔒 Security & Privacy

- **Read-only access** to Tally data
- **No data storage** - all data remains in Tally
- **Local processing** - no cloud dependencies
- **Direct connection** - no third-party servers

## 📝 System Requirements

### Minimum
- Windows 10/11 (64-bit)
- 4GB RAM
- 100MB disk space
- Network access to Tally server

### Recommended
- Windows 11
- 8GB RAM
- SSD storage
- Stable network connection

## 📄 License

MIT License - Free for commercial and personal use.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branches
3. Submit pull requests
4. Follow existing code style

## 📞 Support

### Common Issues
- **Connection Failed**: Check Tally XML server settings
- **No Companies Found**: Verify Tally has company data
- **Slow Response**: Normal for large Tally databases
- **Build Errors**: Ensure Windows environment for .exe builds

### Field Reference
See `BUILD_INSTRUCTIONS.md` for complete field lists and technical details.

---

**🎯 Perfect for Tally integration developers and business analysts who need to understand Tally's data structure quickly and efficiently.**