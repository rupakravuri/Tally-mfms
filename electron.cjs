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
    return JSON.parse(configData);
  } catch (error) {
    // Return default config
    return {
      host: 'localhost',
      port: 27017,
      username: '',
      password: '',
      databaseName: 'tally_inventory',
      collectionName: 'inventories',
      authSource: 'admin',
      connectionOptions: {
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10
      }
    };
  }
}

async function saveMongoConfig(config) {
  try {
    const configPath = await getMongoConfigPath();
    const configDir = path.dirname(configPath);
    
    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving MongoDB config:', error);
    throw error;
  }
}

function buildConnectionString(config) {
  const { host, port, username, password, databaseName, authSource } = config;
  
  if (username && password) {
    return `mongodb://${username}:${password}@${host}:${port}/${databaseName}?authSource=${authSource || 'admin'}`;
  } else {
    return `mongodb://${host}:${port}/${databaseName}`;
  }
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
    testClient = new MongoClient(connectionString, {
      ...config.connectionOptions,
      serverSelectionTimeoutMS: 5000
    });
    
    await testClient.connect();
    const db = testClient.db(config.databaseName);
    await db.admin().ping();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
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

// Configuration Collections Support
ipcMain.handle('mongo-load-mongo-config', async () => {
  try {
    if (!mongoDB) {
      const connectResult = await connectToMongo();
      if (!connectResult.success) {
        throw new Error('Failed to connect to MongoDB');
      }
    }
    
    const collection = mongoDB.collection('mongo_configurations');
    const configs = await collection.find({}).sort({ updatedAt: -1 }).limit(1).toArray();
    
    return configs.length > 0 ? configs[0] : null;
  } catch (error) {
    console.error('Error loading mongo config from database:', error);
    return null;
  }
});

ipcMain.handle('mongo-save-mongo-config', async (event, config) => {
  try {
    if (!mongoDB) {
      const connectResult = await connectToMongo();
      if (!connectResult.success) {
        throw new Error('Failed to connect to MongoDB');
      }
    }
    
    const collection = mongoDB.collection('mongo_configurations');
    const filter = config._id ? { _id: config._id } : { databaseName: config.databaseName };
    
    config.updatedAt = new Date();
    if (!config._id) {
      config.createdAt = new Date();
    }
    
    const result = await collection.updateOne(filter, { $set: config }, { upsert: true });
    return { success: true, result };
  } catch (error) {
    throw new Error(`Failed to save mongo config to database: ${error.message}`);
  }
});

ipcMain.handle('mongo-load-field-mapping-config', async (event, companyName) => {
  try {
    if (!mongoDB) {
      const connectResult = await connectToMongo();
      if (!connectResult.success) {
        throw new Error('Failed to connect to MongoDB');
      }
    }
    
    const collection = mongoDB.collection('field_mapping_configurations');
    const filter = companyName ? { companyName } : {};
    const configs = await collection.find(filter).sort({ updatedAt: -1 }).limit(1).toArray();
    
    return configs.length > 0 ? configs[0] : null;
  } catch (error) {
    console.error('Error loading field mapping config from database:', error);
    return null;
  }
});

ipcMain.handle('mongo-save-field-mapping-config', async (event, config) => {
  try {
    if (!mongoDB) {
      const connectResult = await connectToMongo();
      if (!connectResult.success) {
        throw new Error('Failed to connect to MongoDB');
      }
    }
    
    const collection = mongoDB.collection('field_mapping_configurations');
    const filter = config._id 
      ? { _id: config._id } 
      : config.companyName 
        ? { companyName: config.companyName }
        : { version: config.version };
    
    config.lastUpdated = new Date().toISOString();
    config.updatedAt = new Date();
    if (!config._id) {
      config.createdAt = new Date();
    }
    
    const result = await collection.updateOne(filter, { $set: config }, { upsert: true });
    return { success: true, result };
  } catch (error) {
    throw new Error(`Failed to save field mapping config to database: ${error.message}`);
  }
});

// General IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('quit-app', () => {
  app.quit();
});