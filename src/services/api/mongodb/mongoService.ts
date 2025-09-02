// MongoDB Service for Tally Integration - IPC Version
// This service now uses Electron IPC to communicate with MongoDB in the main process

export interface MongoDocument {
  _id?: string;
  productId?: string;
  name?: string;
  date?: Date;
  fms_status?: boolean;
  product?: string[];
  companies?: string[];
  [key: string]: any;
}

export interface SyncResult {
  success: boolean;
  inserted: number;
  updated: number;
  errors: string[];
  totalProcessed: number;
}

export interface MongoConfiguration {
  host: string;
  port: number;
  username: string;
  password: string;
  databaseName: string;
  collectionName: string;
  authSource: string;
  connectionOptions: {
    useUnifiedTopology: boolean;
    serverSelectionTimeoutMS: number;
    connectTimeoutMS: number;
    maxPoolSize: number;
  };
}

// MongoDB Service that uses Electron IPC for database operations
export class MongoService {
  private static instance: MongoService;
  
  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): MongoService {
    if (!MongoService.instance) {
      MongoService.instance = new MongoService();
    }
    return MongoService.instance;
  }

  // Check if running in Electron environment
  private isElectron(): boolean {
    return typeof window !== 'undefined' && window.electronAPI && window.electronAPI.mongo;
  }

  private getElectronAPI() {
    if (!this.isElectron()) {
      throw new Error('MongoDB operations are only available in Electron environment');
    }
    return window.electronAPI.mongo;
  }

  public async loadConfiguration(): Promise<MongoConfiguration> {
    const api = this.getElectronAPI();
    return await api.loadConfig();
  }

  public async saveConfiguration(config: MongoConfiguration): Promise<void> {
    const api = this.getElectronAPI();
    await api.saveConfig(config);
  }

  public async connect(): Promise<{ success: boolean; error?: string }> {
    const api = this.getElectronAPI();
    return await api.connect();
  }

  public async disconnect(): Promise<void> {
    const api = this.getElectronAPI();
    await api.disconnect();
  }

  public async testConnection(config: MongoConfiguration): Promise<{ success: boolean; error?: string }> {
    const api = this.getElectronAPI();
    return await api.testConnection(config);
  }

  public async insertDocument(document: MongoDocument, collectionName?: string): Promise<any> {
    const api = this.getElectronAPI();
    return await api.insertDocument(document, collectionName);
  }

  public async updateDocument(
    filter: Record<string, any>, 
    update: Record<string, any>,
    collectionName?: string,
    upsert: boolean = true
  ): Promise<any> {
    const api = this.getElectronAPI();
    return await api.updateDocument(filter, update, collectionName, upsert);
  }

  public async findDocument(filter: Record<string, any>, collectionName?: string): Promise<MongoDocument | null> {
    const api = this.getElectronAPI();
    return await api.findDocument(filter, collectionName);
  }

  public async findDocuments(filter: Record<string, any>, collectionName?: string): Promise<MongoDocument[]> {
    const api = this.getElectronAPI();
    return await api.findDocuments(filter, collectionName);
  }

  public async upsertDocument(
    filter: Record<string, any>,
    document: MongoDocument,
    collectionName?: string
  ): Promise<{ inserted: boolean; updated: boolean }> {
    try {
      const result = await this.updateDocument(filter, document, collectionName, true);
      
      return {
        inserted: result.upsertedCount > 0,
        updated: result.modifiedCount > 0
      };
    } catch (error) {
      console.error('Error upserting document:', error);
      throw error;
    }
  }

  public async bulkUpsert(
    documents: Array<{ filter: Record<string, any>; document: MongoDocument }>,
    collectionName?: string
  ): Promise<SyncResult> {
    const api = this.getElectronAPI();
    return await api.bulkUpsert(documents, collectionName);
  }

  public async getCollectionStats(collectionName?: string): Promise<any> {
    const api = this.getElectronAPI();
    return await api.getCollectionStats(collectionName);
  }

  // Legacy method compatibility
  public async ensureConnection(): Promise<void> {
    await this.connect();
  }

  public getCollection(collectionName?: string): any {
    // This method is not needed in IPC version but kept for compatibility
    throw new Error('getCollection is not available in IPC version. Use specific methods instead.');
  }
}