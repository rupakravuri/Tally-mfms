// MongoDB Service for Tally Integration
import { MongoClient, Db, Collection, InsertOneResult, UpdateResult } from 'mongodb';
import { MongoConfiguration, MongoConfigService } from '../../config/mongoConfig';

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

export class MongoService {
  private static instance: MongoService;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: MongoConfiguration | null = null;
  private configService: MongoConfigService;

  private constructor() {
    this.configService = MongoConfigService.getInstance();
  }

  public static getInstance(): MongoService {
    if (!MongoService.instance) {
      MongoService.instance = new MongoService();
    }
    return MongoService.instance;
  }

  public async connect(config?: MongoConfiguration): Promise<boolean> {
    try {
      if (config) {
        this.config = config;
      } else {
        this.config = await this.configService.loadConfiguration();
      }

      if (!this.config.isActive && !config) {
        throw new Error('MongoDB configuration is not active');
      }

      const connectionString = this.configService.buildConnectionString(this.config);
      
      this.client = new MongoClient(connectionString, this.config.connectionOptions);
      await this.client.connect();
      
      this.db = this.client.db(this.config.databaseName);
      
      // Test the connection
      await this.db.admin().ping();
      
      await this.configService.updateConnectionStatus(true);
      console.log('MongoDB connected successfully');
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      console.error('MongoDB connection failed:', errorMessage);
      await this.configService.updateConnectionStatus(false, errorMessage);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        console.log('MongoDB disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }

  public async testConnection(config: MongoConfiguration): Promise<{ success: boolean; error?: string }> {
    let testClient: MongoClient | null = null;
    
    try {
      const connectionString = this.configService.buildConnectionString(config);
      testClient = new MongoClient(connectionString, {
        ...config.connectionOptions,
        serverSelectionTimeoutMS: 5000 // Quick timeout for testing
      });
      
      await testClient.connect();
      const db = testClient.db(config.databaseName);
      await db.admin().ping();
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
      
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

  public async ensureConnection(): Promise<void> {
    if (!this.client || !this.db) {
      await this.connect();
    }
  }

  public getCollection(collectionName?: string): Collection<MongoDocument> {
    if (!this.db) {
      throw new Error('MongoDB not connected');
    }
    
    const collection = collectionName || this.config?.collectionName || 'inventories';
    return this.db.collection<MongoDocument>(collection);
  }

  public async insertDocument(document: MongoDocument, collectionName?: string): Promise<InsertOneResult> {
    await this.ensureConnection();
    const collection = this.getCollection(collectionName);
    
    // Add metadata
    document.date = document.date || new Date();
    
    return await collection.insertOne(document);
  }

  public async updateDocument(
    filter: Record<string, any>, 
    update: Record<string, any>,
    collectionName?: string,
    upsert: boolean = true
  ): Promise<UpdateResult> {
    await this.ensureConnection();
    const collection = this.getCollection(collectionName);
    
    // Add update timestamp
    update.date = new Date();
    
    return await collection.updateOne(filter, { $set: update }, { upsert });
  }

  public async findDocument(filter: Record<string, any>, collectionName?: string): Promise<MongoDocument | null> {
    await this.ensureConnection();
    const collection = this.getCollection(collectionName);
    return await collection.findOne(filter);
  }

  public async findDocuments(filter: Record<string, any>, collectionName?: string): Promise<MongoDocument[]> {
    await this.ensureConnection();
    const collection = this.getCollection(collectionName);
    return await collection.find(filter).toArray();
  }

  public async upsertDocument(
    filter: Record<string, any>,
    document: MongoDocument,
    collectionName?: string
  ): Promise<{ inserted: boolean; updated: boolean }> {
    await this.ensureConnection();
    
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
    await this.ensureConnection();
    const collection = this.getCollection(collectionName);
    
    const result: SyncResult = {
      success: true,
      inserted: 0,
      updated: 0,
      errors: [],
      totalProcessed: 0
    };

    try {
      const bulkOps = documents.map(({ filter, document }) => ({
        updateOne: {
          filter,
          update: { $set: { ...document, date: new Date() } },
          upsert: true
        }
      }));

      if (bulkOps.length === 0) {
        return result;
      }

      const bulkResult = await collection.bulkWrite(bulkOps);
      
      result.inserted = bulkResult.upsertedCount;
      result.updated = bulkResult.modifiedCount;
      result.totalProcessed = documents.length;
      
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown bulk operation error');
    }

    return result;
  }

  public async getCollectionStats(collectionName?: string): Promise<any> {
    await this.ensureConnection();
    const collection = this.getCollection(collectionName);
    
    try {
      const stats = await this.db!.command({ collStats: collection.collectionName });
      const count = await collection.countDocuments();
      
      return {
        count,
        size: stats.size,
        storageSize: stats.storageSize,
        indexes: stats.nindexes,
        avgObjSize: stats.avgObjSize
      };
    } catch (error) {
      console.error('Error getting collection stats:', error);
      return null;
    }
  }

  public isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  public getConnectionStatus(): { connected: boolean; database?: string; collection?: string } {
    return {
      connected: this.isConnected(),
      database: this.config?.databaseName,
      collection: this.config?.collectionName
    };
  }
}