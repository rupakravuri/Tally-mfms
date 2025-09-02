const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const os = require('os');
const isDev = process.env.NODE_ENV === 'development';

// Add command line switches for sandbox environment
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-setuid-sandbox');

let mainWindow;

// MongoDB connection management
let mongoClient = null;
let mongoDB = null;
let mongoConfig = null;

// MongoDB Service Functions
async function getMongoConfigPath() {
  const homeDir = os.homedir();
  const configDir = path.join(homeDir, '.tally-field-extractor');
  return path.join(configDir, 'mongo-config.json');
}

async function loadMongoConfig() {
  try {
    const configPath = await getMongoConfigPath();
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Ensure connection options are present and updated
    if (!config.connectionOptions) {
      config.connectionOptions = getDefaultConnectionOptions();
    }
    
    return config;
  } catch (error) {
    console.log('Loading default MongoDB configuration:', error.message);
    // Return default config
    return {
      host: 'localhost',
      port: 27017,
      username: '',
      password: '',
      databaseName: 'tally_sync',
      collectionName: 'inventories',
      authSource: 'admin',
      connectionString: 'mongodb://localhost:27017',
      connectionOptions: getDefaultConnectionOptions()
    };
  }
}

function getDefaultConnectionOptions() {
  return {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000, // 30 seconds for external connections
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    heartbeatFrequencyMS: 10000,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
  };
}

async function saveMongoConfig(config) {
  try {
    const configPath = await getMongoConfigPath();
    const configDir = path.dirname(configPath);
    
    // Ensure directory exists with proper error handling
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (dirError) {
      if (dirError.code !== 'EEXIST') {
        console.error('Error creating config directory:', dirError);
        throw new Error(`Failed to create config directory: ${configDir}`);
      }
    }
    
    // Add default connection options if not present
    const configToSave = {
      ...config,
      connectionOptions: {
        ...getDefaultConnectionOptions(),
        ...config.connectionOptions
      }
    };
    
    await fs.writeFile(configPath, JSON.stringify(configToSave, null, 2));
    console.log('MongoDB configuration saved successfully to:', configPath);
    return true;
  } catch (error) {
    console.error('Error saving MongoDB config:', error);
    throw new Error(`Failed to save MongoDB configuration: ${error.message}`);
  }
}

function buildConnectionString(config) {
  // If config already has a full connection string, use it
  if (config.connectionString && (config.connectionString.startsWith('mongodb://') || config.connectionString.startsWith('mongodb+srv://'))) {
    return config.connectionString;
  }
  
  const { host, port, username, password, databaseName, authSource } = config;
  
  let connectionString = 'mongodb://';
  
  if (username && password) {
    connectionString += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }
  
  connectionString += `${host || 'localhost'}:${port || 27017}`;
  
  if (databaseName) {
    connectionString += `/${databaseName}`;
  }
  
  const options = [];
  if (username && password && authSource) {
    options.push(`authSource=${authSource}`);
  }
  
  if (options.length > 0) {
    connectionString += `?${options.join('&')}`;
  }
  
  return connectionString;
}

async function connectToMongo() {
  try {
    if (mongoClient && mongoDB) {
      return { success: true };
    }

    mongoConfig = await loadMongoConfig();
    const connectionString = buildConnectionString(mongoConfig);
    
    mongoClient = new MongoClient(connectionString, mongoConfig.connectionOptions);
    await mongoClient.connect();
    mongoDB = mongoClient.db(mongoConfig.databaseName);
    
    console.log('MongoDB connected successfully');
    return { success: true };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return { success: false, error: error.message };
  }
}

async function disconnectFromMongo() {
  try {
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = null;
      mongoDB = null;
      console.log('MongoDB disconnected');
    }
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
}

async function testMongoConnection(config) {
  let testClient = null;
  
  try {
    const connectionString = buildConnectionString(config);
    console.log('Testing MongoDB connection to:', connectionString.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    // Use more lenient timeout for external connections during testing
    const testOptions = {
      ...getDefaultConnectionOptions(),
      ...config.connectionOptions,
      serverSelectionTimeoutMS: 15000, // 15 seconds for connection test
      connectTimeoutMS: 15000
    };
    
    testClient = new MongoClient(connectionString, testOptions);
    
    await testClient.connect();
    const db = testClient.db(config.databaseName || 'tally_sync');
    
    // Test the connection with ping
    await db.admin().ping();
    
    console.log('MongoDB connection test successful');
    return { success: true };
  } catch (error) {
    console.error('MongoDB connection test failed:', error.message);
    
    // Provide more specific error messages
    let friendlyError = error.message;
    if (error.message.includes('ENOTFOUND')) {
      friendlyError = 'Cannot resolve hostname. Please check the server address.';
    } else if (error.message.includes('ECONNREFUSED')) {
      friendlyError = 'Connection refused. Please check if MongoDB is running and accessible.';
    } else if (error.message.includes('Authentication failed')) {
      friendlyError = 'Authentication failed. Please check your username and password.';
    } else if (error.message.includes('Server selection timed out')) {
      friendlyError = 'Connection timeout. The server may be unreachable or overloaded.';
    }
    
    return { success: false, error: friendlyError };
  } finally {
    if (testClient) {
      try {
        await testClient.close();
      } catch (closeError) {
        console.error('Error closing test connection:', closeError);
      }
    }
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: Add app icon
    title: 'Tally Field Extractor',
    show: false, // Don't show until ready
    autoHideMenuBar: true, // Hide menu bar for cleaner look
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for MongoDB
ipcMain.handle('mongo-load-config', async () => {
  try {
    return await loadMongoConfig();
  } catch (error) {
    throw new Error(`Failed to load MongoDB config: ${error.message}`);
  }
});

ipcMain.handle('mongo-save-config', async (event, config) => {
  try {
    await saveMongoConfig(config);
    mongoConfig = config; // Update current config
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to save MongoDB config: ${error.message}`);
  }
});

ipcMain.handle('mongo-test-connection', async (event, config) => {
  return await testMongoConnection(config);
});

ipcMain.handle('mongo-connect', async () => {
  return await connectToMongo();
});

ipcMain.handle('mongo-disconnect', async () => {
  await disconnectFromMongo();
  return { success: true };
});

ipcMain.handle('mongo-insert-document', async (event, document, collectionName) => {
  try {
    if (!mongoDB) {
      const connectResult = await connectToMongo();
      if (!connectResult.success) {
        throw new Error('Failed to connect to MongoDB');
      }
    }
    
    const collection = mongoDB.collection(collectionName || mongoConfig?.collectionName || 'inventories');
    document.date = document.date || new Date();
    
    const result = await collection.insertOne(document);
    return result;
  } catch (error) {
    throw new Error(`Failed to insert document: ${error.message}`);
  }
});

ipcMain.handle('mongo-update-document', async (event, filter, update, collectionName, upsert = true) => {
  try {
    if (!mongoDB) {
      const connectResult = await connectToMongo();
      if (!connectResult.success) {
        throw new Error('Failed to connect to MongoDB');
      }
    }
    
    const collection = mongoDB.collection(collectionName || mongoConfig?.collectionName || 'inventories');
    update.date = new Date();
    
    const result = await collection.updateOne(filter, { $set: update }, { upsert });
    return result;
  } catch (error) {
    throw new Error(`Failed to update document: ${error.message}`);
  }
});

ipcMain.handle('mongo-find-document', async (event, filter, collectionName) => {
  try {
    if (!mongoDB) {
      const connectResult = await connectToMongo();
      if (!connectResult.success) {
        throw new Error('Failed to connect to MongoDB');
      }
    }
    
    const collection = mongoDB.collection(collectionName || mongoConfig?.collectionName || 'inventories');
    const result = await collection.findOne(filter);
    return result;
  } catch (error) {
    throw new Error(`Failed to find document: ${error.message}`);
  }
});

ipcMain.handle('mongo-find-documents', async (event, filter, collectionName) => {
  try {
    if (!mongoDB) {
      const connectResult = await connectToMongo();
      if (!connectResult.success) {
        throw new Error('Failed to connect to MongoDB');
      }
    }
    
    const collection = mongoDB.collection(collectionName || mongoConfig?.collectionName || 'inventories');
    const result = await collection.find(filter).toArray();
    return result;
  } catch (error) {
    throw new Error(`Failed to find documents: ${error.message}`);
  }
});

ipcMain.handle('mongo-bulk-upsert', async (event, documents, collectionName) => {
  try {
    if (!mongoDB) {
      const connectResult = await connectToMongo();
      if (!connectResult.success) {
        throw new Error('Failed to connect to MongoDB');
      }
    }
    
    const collection = mongoDB.collection(collectionName || mongoConfig?.collectionName || 'inventories');
    
    const result = {
      success: true,
      inserted: 0,
      updated: 0,
      errors: [],
      totalProcessed: 0
    };

    if (documents.length === 0) {
      return result;
    }

    const bulkOps = documents.map(({ filter, document }) => ({
      updateOne: {
        filter,
        update: { $set: { ...document, date: new Date() } },
        upsert: true
      }
    }));

    const bulkResult = await collection.bulkWrite(bulkOps);
    
    result.inserted = bulkResult.upsertedCount;
    result.updated = bulkResult.modifiedCount;
    result.totalProcessed = documents.length;
    
    return result;
  } catch (error) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      errors: [error.message],
      totalProcessed: documents.length
    };
  }
});

ipcMain.handle('mongo-get-collection-stats', async (event, collectionName) => {
  try {
    if (!mongoDB) {
      const connectResult = await connectToMongo();
      if (!connectResult.success) {
        throw new Error('Failed to connect to MongoDB');
      }
    }
    
    const collection = mongoDB.collection(collectionName || mongoConfig?.collectionName || 'inventories');
    
    const stats = await mongoDB.command({ collStats: collection.collectionName });
    const count = await collection.countDocuments();
    
    return {
      count,
      size: stats.size,
      storageSize: stats.storageSize,
      indexes: stats.nindexes,
      avgObjSize: stats.avgObjSize
    };
  } catch (error) {
    throw new Error(`Failed to get collection stats: ${error.message}`);
  }
});

// General IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('quit-app', () => {
  app.quit();
});