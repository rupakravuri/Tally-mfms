// MongoDB Configuration Service - Database Storage Version
import { MongoService } from '../api/mongodb/mongoService';

export interface MongoConfiguration {
  _id?: string;
  connectionString: string;
  databaseName: string;
  collectionName: string;
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  authDatabase?: string;
  ssl?: boolean;
  replicaSet?: string;
  connectionOptions?: Record<string, any>;
  isActive: boolean;
  lastConnected?: string;
  lastError?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoConfigDbService {
  private static instance: MongoConfigDbService;
  private mongoService: MongoService;
  private readonly COLLECTION_NAME = 'mongo_configurations';

  private constructor() {
    this.mongoService = MongoService.getInstance();
  }

  public static getInstance(): MongoConfigDbService {
    if (!MongoConfigDbService.instance) {
      MongoConfigDbService.instance = new MongoConfigDbService();
    }
    return MongoConfigDbService.instance;
  }

  private getDefaultConfiguration(): MongoConfiguration {
    return {
      connectionString: 'mongodb://localhost:27017',
      databaseName: 'tally_sync',
      collectionName: 'inventories',
      isActive: false,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    };
  }

  public async loadConfiguration(): Promise<MongoConfiguration> {
    try {
      // Try to get configuration from database via IPC
      const config = await this.mongoService.loadMongoConfig();
      
      if (config) {
        // Merge with defaults to ensure all required fields
        const defaultConfig = this.getDefaultConfiguration();
        return {
          ...defaultConfig,
          ...config,
          connectionOptions: {
            ...defaultConfig.connectionOptions,
            ...(config.connectionOptions || {})
          }
        };
      }
    } catch (error) {
      console.error('Error loading MongoDB configuration from database:', error);
      // Fall back to default if database is not accessible
    }
    
    // Return default configuration and try to save it
    const defaultConfig = this.getDefaultConfiguration();
    try {
      await this.saveConfiguration(defaultConfig);
    } catch (saveError) {
      console.warn('Could not save default configuration to database:', saveError);
    }
    
    return defaultConfig;
  }

  public async saveConfiguration(config: MongoConfiguration): Promise<void> {
    try {
      const configToSave = {
        ...config,
        updatedAt: new Date(),
        version: config.version || '1.0.0'
      };

      // If this is a new config, set createdAt
      if (!config._id) {
        configToSave.createdAt = new Date();
      }

      // Save to database using IPC
      await this.mongoService.saveMongoConfig(configToSave);
    } catch (error) {
      console.error('Error saving MongoDB configuration to database:', error);
      throw new Error('Failed to save MongoDB configuration to database');
    }
  }

  public async updateConnectionStatus(isActive: boolean, error?: string): Promise<void> {
    try {
      const config = await this.loadConfiguration();
      config.isActive = isActive;
      config.lastConnected = isActive ? new Date().toISOString() : config.lastConnected;
      config.lastError = error;
      await this.saveConfiguration(config);
    } catch (saveError) {
      console.error('Error updating connection status:', saveError);
    }
  }

  public async getAllConfigurations(): Promise<MongoConfiguration[]> {
    try {
      const configs = await this.mongoService.findDocuments(
        {}, 
        this.COLLECTION_NAME
      );
      return configs as MongoConfiguration[] || [];
    } catch (error) {
      console.error('Error getting all configurations:', error);
      return [];
    }
  }

  public async deleteConfiguration(configId: string): Promise<void> {
    try {
      // Note: We would need to implement delete functionality in mongoService
      // For now, we'll mark it as inactive
      const config = await this.mongoService.findDocument(
        { _id: configId },
        this.COLLECTION_NAME
      );
      
      if (config) {
        await this.mongoService.updateDocument(
          { _id: configId },
          { ...config, isActive: false, updatedAt: new Date() },
          this.COLLECTION_NAME,
          false
        );
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      throw new Error('Failed to delete configuration');
    }
  }

  public buildConnectionString(config: MongoConfiguration): string {
    if (config.connectionString && config.connectionString.startsWith('mongodb')) {
      return config.connectionString;
    }

    const host = config.host || 'localhost';
    const port = config.port || 27017;
    
    let connectionString = 'mongodb://';
    
    if (config.username && config.password) {
      connectionString += `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`;
    }
    
    connectionString += `${host}:${port}`;
    
    if (config.databaseName) {
      connectionString += `/${config.databaseName}`;
    }
    
    const options: string[] = [];
    if (config.authDatabase) {
      options.push(`authSource=${config.authDatabase}`);
    }
    if (config.replicaSet) {
      options.push(`replicaSet=${config.replicaSet}`);
    }
    if (config.ssl) {
      options.push('ssl=true');
    }
    
    if (options.length > 0) {
      connectionString += `?${options.join('&')}`;
    }
    
    return connectionString;
  }

  public parseConnectionString(connectionString: string): Partial<MongoConfiguration> {
    try {
      const url = new URL(connectionString);
      
      return {
        connectionString,
        host: url.hostname,
        port: url.port ? parseInt(url.port) : 27017,
        username: url.username ? decodeURIComponent(url.username) : undefined,
        password: url.password ? decodeURIComponent(url.password) : undefined,
        databaseName: url.pathname.slice(1) || undefined,
        ssl: url.searchParams.get('ssl') === 'true',
        replicaSet: url.searchParams.get('replicaSet') || undefined,
        authDatabase: url.searchParams.get('authSource') || undefined
      };
    } catch (error) {
      console.error('Error parsing connection string:', error);
      return { connectionString };
    }
  }
}