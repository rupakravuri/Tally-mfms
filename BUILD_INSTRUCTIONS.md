# Tally Field Extractor - Windows Build Instructions

## Overview
This application is a **simplified Tally ERP field extractor** that provides:
- Company selection from Tally server (localhost or custom)
- Lists all available fields in **Sales Vouchers** (56+ fields)
- Lists all available fields in **Stock Items** (80+ fields)
- Real-time connection status monitoring
- Clean, focused desktop interface

## Prerequisites

### Required Software:
1. **Node.js 16+** - [Download from nodejs.org](https://nodejs.org/)
2. **Git** - [Download from git-scm.com](https://git-scm.com/)

### For Windows .exe Build:
- **Windows 10/11** (required for native Windows builds)
- **PowerShell or Command Prompt**

## Setup Instructions

### 1. Clone/Download the Project
```bash
# If you have git:
git clone <repository-url>
cd tally-field-extractor

# Or extract the provided ZIP file
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Test the Application
```bash
# Start development server
npm run dev

# Open browser to http://localhost:5173
# Test connection to your Tally server
```

### 4. Configure Your Tally Server (Optional)
Edit `src/TallyFieldExtractor.tsx` line 12 to change default server:
```javascript
defaultServerUrl = 'your-tally-server:9000'
```

## Building Windows Executable

### Method 1: Direct Build (Recommended)
```bash
# Build the web assets
npm run build

# Build Windows executable
npm run dist
```

The executable will be created in the `release/` directory.

### Method 2: Alternative Build Commands
```bash
# For portable Windows executable
npx electron-builder --win --x64 --publish=never

# For installer (NSIS)
npx electron-builder --win --nsis --publish=never
```

## Application Features

### 🏢 Company Selection
- Connects to Tally server (localhost:9000 by default)
- Lists all available companies
- Real-time connection status

### 📋 Sales Voucher Fields (56 Fields)
Complete field extraction including:
- **Basic Fields**: GUID, VOUCHERNUMBER, DATE, VOUCHERTYPE, PARTYLEDGERNAME
- **Amount Fields**: AMOUNT, RATE, ACTUALQTY, BILLEDQTY, DISCOUNT
- **GST Fields**: GSTHSNCODE, GSTRATE, CGSTRATE, SGSTRATE, IGSTRATE
- **Inventory Fields**: STOCKITEMNAME, GODOWNNAME, REJECTEDQTY
- **Address Fields**: PARTYADDRESS, BASICSELLERADDRESS
- **Status Fields**: AUDITED, ISOPTIONAL, ASORIGINAL, ISDELETED
- And many more...

### 📦 Stock Item Fields (80+ Fields)
Complete stock item information including:
- **Basic Info**: NAME, ALIAS, PARENT, CATEGORY, GUID
- **Pricing**: SALESPRICE, PURCHASEPRICE, MRP, MINSELLINGPRICE
- **Units**: STOCKUOM, PURCHASEUOM, SALESUOM
- **Tax Info**: GSTAPPLICABLE, VATAPPLICABLE, GSTHSNCODE
- **Inventory**: MINIMUM, MAXIMUM, REORDER, OPENINGBALANCE
- **Flags**: ISBATCHWISEON, ISPERISHABLEON, IGNORENEGATIVESTOCK
- **Costing**: COSTINGMETHOD, VALUATIONMETHOD, STANDARDCOST
- And comprehensive field coverage...

### 🔄 Connection Status
- Real-time connectivity checking
- Port 9000 monitoring
- Error reporting with detailed messages
- Automatic retry functionality

## File Structure
```
tally-field-extractor/
├── src/
│   ├── TallyFieldExtractor.tsx    # Main application component
│   ├── services/                  # Tally API services
│   └── components/                # UI components
├── electron.js                    # Electron main process
├── preload.js                     # Electron preload script
├── package.json                   # Dependencies & build config
└── BUILD_INSTRUCTIONS.md          # This file
```

## Troubleshooting

### Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist release
npm run build
```

### Connection Issues
1. **Ensure Tally is running** on the target server
2. **Enable XML Server** in Tally (Gateway of Tally → F11 → Advanced Configuration → Security Control → Data Configuration → Internet → Load as service at startup: Yes)
3. **Check port 9000** is accessible
4. **Test with curl**:
   ```bash
   curl -X POST http://localhost:9000 -H "Content-Type: text/xml" -d "<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>EXPORT</TALLYREQUEST></HEADER></ENVELOPE>"
   ```

### Electron Issues
- Ensure you're building on Windows for Windows
- For cross-platform builds, use Docker or CI/CD services
- Check antivirus isn't blocking the build process

## Customization

### Change Default Server
Edit `/src/TallyFieldExtractor.tsx`:
```javascript
const TallyFieldExtractor: React.FC<TallyFieldExtractorProps> = ({ 
  defaultServerUrl = 'your-server-ip:9000'  // Change this
}) => {
```

### Add More Fields
The field lists are defined in the component. You can add more fields by editing:
- `salesVoucherFieldsList` array for sales voucher fields
- `stockItemFieldsList` array for stock item fields

### UI Customization
The interface uses Tailwind CSS. Modify classes in the component for styling changes.

## Production Deployment

### Standalone Executable
The built .exe file is completely standalone and includes:
- Node.js runtime
- Chromium browser engine
- All dependencies
- No installation required

### System Requirements
- **Windows 10/11**
- **64-bit architecture**
- **4GB RAM minimum**
- **100MB disk space**

## Support

### Common Use Cases
1. **Field Discovery**: Use this tool to discover all available fields before building custom Tally integrations
2. **API Documentation**: Generate field reference documentation for development teams
3. **Data Mapping**: Map Tally fields to external systems
4. **Testing**: Verify Tally connectivity and data structure

### Field Categories Covered
- **Voucher Management**: All voucher types and their fields
- **Inventory Management**: Complete stock item information
- **GST Compliance**: All GST-related fields and rates
- **Financial Data**: Amount, pricing, and calculation fields
- **Master Data**: Company, party, and reference information

## Version Information
- **Application**: Tally Field Extractor v1.0
- **Electron**: v33.2.1
- **Node.js**: 18+
- **Supported Tally**: Prime 6.0+ with XML API enabled

---

**Built with ❤️ for Tally ERP integration developers**