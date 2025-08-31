// MongoDB Configuration Service
import { StorageService } from '../storage/storageService';

export interface MongoConfiguration {
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
}

export class MongoConfigService {
  private static instance: MongoConfigService;
  private storageService: StorageService;
  private configPath: string;

  private constructor() {
    this.storageService = StorageService.getInstance();
    const configDir = this.storageService.getConfigPath();
    this.configPath = `${configDir}/mongodb-config.json`;
  }

  public static getInstance(): MongoConfigService {
    if (!MongoConfigService.instance) {
      MongoConfigService.instance = new MongoConfigService();
    }
    return MongoConfigService.instance;
  }

  private getDefaultConfiguration(): MongoConfiguration {
    return {
      connectionString: 'mongodb://localhost:27017',
      databaseName: 'tally_sync',
      collectionName: 'inventories',
      isActive: false,
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
      const configData = await this.storageService.readFile(this.configPath);
      if (configData) {
        const config = JSON.parse(configData) as MongoConfiguration;
        
        // Merge with defaults
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
      console.error('Error loading MongoDB configuration:', error);
    }
    
    const defaultConfig = this.getDefaultConfiguration();
    await this.saveConfiguration(defaultConfig);
    return defaultConfig;
  }

  public async saveConfiguration(config: MongoConfiguration): Promise<void> {
    try {
      // Don't save sensitive information in plain text in production
      const configToSave = { ...config };
      
      // In production, you might want to encrypt sensitive data
      if (process.env.NODE_ENV === 'production') {
        // For now, we'll save everything but in production you'd encrypt password
        // configToSave.password = this.encrypt(config.password);
      }

      const success = await this.storageService.writeFile(
        this.configPath, 
        JSON.stringify(configToSave, null, 2)
      );
      
      if (!success) {
        throw new Error('Failed to write configuration file');
      }
    } catch (error) {
      console.error('Error saving MongoDB configuration:', error);
      throw new Error('Failed to save MongoDB configuration');
    }
  }

  public async updateConnectionStatus(isActive: boolean, error?: string): Promise<void> {
    const config = await this.loadConfiguration();
    config.isActive = isActive;
    config.lastConnected = isActive ? new Date().toISOString() : config.lastConnected;
    config.lastError = error;
    await this.saveConfiguration(config);
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