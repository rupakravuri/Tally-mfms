// Tally to MongoDB Sync Service
import { MongoService, MongoDocument, SyncResult } from '../mongodb/mongoService';
import { FieldMappingConfigService, FieldMapping, CustomField } from '../../config/fieldMappingConfig';
import { StockItemApiService, TallyStockItem } from '../inventory/stockItemApiService';

export interface SyncProgress {
  phase: 'connecting' | 'fetching' | 'mapping' | 'syncing' | 'completed' | 'error';
  message: string;
  progress: number; // 0-100
  current?: number;
  total?: number;
  details?: any;
}

export interface SyncOptions {
  companyName: string;
  collectionName?: string;
  batchSize?: number;
  onProgress?: (progress: SyncProgress) => void;
  dryRun?: boolean;
}

export class TallySyncService {
  private static instance: TallySyncService;
  private mongoService: MongoService;
  private fieldMappingService: FieldMappingConfigService;
  private stockItemService: StockItemApiService;

  private constructor() {
    this.mongoService = MongoService.getInstance();
    this.fieldMappingService = FieldMappingConfigService.getInstance();
    this.stockItemService = new StockItemApiService();
  }

  public static getInstance(): TallySyncService {
    if (!TallySyncService.instance) {
      TallySyncService.instance = new TallySyncService();
    }
    return TallySyncService.instance;
  }

  public async syncStockItems(options: SyncOptions): Promise<SyncResult> {
    const { companyName, collectionName, batchSize = 100, onProgress, dryRun = false } = options;
    
    const result: SyncResult = {
      success: false,
      inserted: 0,
      updated: 0,
      errors: [],
      totalProcessed: 0
    };

    try {
      // Phase 1: Load configuration and connect
      onProgress?.({
        phase: 'connecting',
        message: 'Loading configuration and connecting to services...',
        progress: 5
      });

      const config = await this.fieldMappingService.loadConfiguration();
      const stockMappings = config.stockItemMappings;
      const customFields = config.customFields;

      if (stockMappings.length === 0) {
        throw new Error('No stock item field mappings configured');
      }

      // Connect to MongoDB
      if (!dryRun) {
        await this.mongoService.connect();
      }

      // Phase 2: Fetch Tally stock items
      onProgress?.({
        phase: 'fetching',
        message: 'Fetching stock items from Tally...',
        progress: 15
      });

      const stockItems = await this.stockItemService.getStockItems(companyName);
      
      if (stockItems.length === 0) {
        throw new Error('No stock items found in Tally for the selected company');
      }

      onProgress?.({
        phase: 'fetching',
        message: `Found ${stockItems.length} stock items in Tally`,
        progress: 25,
        total: stockItems.length
      });

      // Phase 3: Map and transform data
      onProgress?.({
        phase: 'mapping',
        message: 'Mapping Tally fields to MongoDB documents...',
        progress: 30
      });

      const mappedDocuments: Array<{ filter: Record<string, any>; document: MongoDocument }> = [];
      const mappingErrors: string[] = [];

      for (let i = 0; i < stockItems.length; i++) {
        const item = stockItems[i];
        const progress = 30 + (i / stockItems.length) * 40; // 30% to 70%

        if (i % 10 === 0) {
          onProgress?.({
            phase: 'mapping',
            message: `Mapping item ${i + 1} of ${stockItems.length}`,
            progress,
            current: i + 1,
            total: stockItems.length
          });
        }

        try {
          const { filter, document } = await this.mapStockItemToMongo(item, stockMappings, customFields);
          mappedDocuments.push({ filter, document });
        } catch (error) {
          const errorMessage = `Error mapping item "${item.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          mappingErrors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      result.errors.push(...mappingErrors);

      if (mappedDocuments.length === 0) {
        throw new Error('No documents could be mapped successfully');
      }

      onProgress?.({
        phase: 'mapping',
        message: `Successfully mapped ${mappedDocuments.length} of ${stockItems.length} items`,
        progress: 70,
        details: { mapped: mappedDocuments.length, errors: mappingErrors.length }
      });

      // Phase 4: Sync to MongoDB
      if (!dryRun) {
        onProgress?.({
          phase: 'syncing',
          message: 'Syncing data to MongoDB...',
          progress: 75
        });

        // Process in batches
        let totalInserted = 0;
        let totalUpdated = 0;
        
        for (let i = 0; i < mappedDocuments.length; i += batchSize) {
          const batch = mappedDocuments.slice(i, i + batchSize);
          const batchProgress = 75 + ((i / mappedDocuments.length) * 20); // 75% to 95%

          onProgress?.({
            phase: 'syncing',
            message: `Syncing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(mappedDocuments.length / batchSize)}`,
            progress: batchProgress,
            current: i + batch.length,
            total: mappedDocuments.length
          });

          const batchResult = await this.mongoService.bulkUpsert(batch, collectionName);
          
          if (!batchResult.success) {
            result.errors.push(...batchResult.errors);
          }
          
          totalInserted += batchResult.inserted;
          totalUpdated += batchResult.updated;
        }

        result.inserted = totalInserted;
        result.updated = totalUpdated;
      } else {
        // Dry run - just simulate the counts
        result.inserted = mappedDocuments.length;
        result.updated = 0;
      }

      result.totalProcessed = mappedDocuments.length;
      result.success = result.errors.length < mappedDocuments.length / 2; // Success if less than 50% errors

      // Phase 5: Complete
      onProgress?.({
        phase: 'completed',
        message: dryRun 
          ? `Dry run completed: ${mappedDocuments.length} items would be processed`
          : `Sync completed: ${result.inserted} inserted, ${result.updated} updated`,
        progress: 100,
        details: result
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      result.errors.push(errorMessage);
      
      onProgress?.({
        phase: 'error',
        message: errorMessage,
        progress: 0,
        details: { error: errorMessage }
      });
    }

    return result;
  }

  private async mapStockItemToMongo(
    item: TallyStockItem,
    mappings: FieldMapping[],
    customFields: CustomField[]
  ): Promise<{ filter: Record<string, any>; document: MongoDocument }> {
    const document: MongoDocument = {};
    const filter: Record<string, any> = {};

    // Apply field mappings
    for (const mapping of mappings) {
      try {
        const tallyValue = this.getTallyFieldValue(item, mapping.tallyField);
        const mappedValue = await this.transformValue(tallyValue, mapping);
        
        if (mappedValue !== undefined && mappedValue !== null) {
          document[mapping.mongoField] = mappedValue;
          
          // Use required fields for filter
          if (mapping.required && mapping.mongoField === 'productId') {
            filter.productId = mappedValue;
          }
        } else if (mapping.required) {
          throw new Error(`Required field "${mapping.tallyField}" is missing or null`);
        }
      } catch (error) {
        throw new Error(`Mapping error for field "${mapping.tallyField}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Apply custom fields
    for (const customField of customFields) {
      if (customField.defaultValue !== undefined) {
        let value = customField.defaultValue;
        
        // Handle dynamic default values
        if (customField.mongoField === 'date') {
          value = new Date();
        }
        
        document[customField.mongoField] = value;
      }
    }

    // Ensure we have a filter (use productId or name as fallback)
    if (Object.keys(filter).length === 0) {
      if (document.productId) {
        filter.productId = document.productId;
      } else if (document.name) {
        filter.name = document.name;
      } else {
        throw new Error('Cannot create filter: no unique identifier found');
      }
    }

    return { filter, document };
  }

  private getTallyFieldValue(item: TallyStockItem, fieldName: string): any {
    // Handle nested properties and case variations
    const normalizedFieldName = fieldName.toLowerCase();
    
    // Direct property access
    if (item.hasOwnProperty(fieldName)) {
      return (item as any)[fieldName];
    }
    
    // Case-insensitive search
    for (const [key, value] of Object.entries(item)) {
      if (key.toLowerCase() === normalizedFieldName) {
        return value;
      }
    }
    
    // Handle common Tally field mappings
    const fieldMappings: Record<string, string> = {
      'guid': 'guid',
      'name': 'name',
      'salesprice': 'salesPrice',
      'purchaseprice': 'purchasePrice',
      'stockuom': 'stockUOM',
      'parent': 'parent',
      'category': 'category',
      'openingbalance': 'openingBalance',
      'mrp': 'mrp'
    };
    
    const mappedField = fieldMappings[normalizedFieldName];
    if (mappedField && item.hasOwnProperty(mappedField)) {
      return (item as any)[mappedField];
    }
    
    return undefined;
  }

  private async transformValue(value: any, mapping: FieldMapping): Promise<any> {
    if (value === undefined || value === null) {
      return mapping.defaultValue;
    }

    try {
      // Apply data type conversion
      switch (mapping.dataType) {
        case 'string':
          return String(value);
        case 'number':
          return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        case 'boolean':
          return Boolean(value);
        case 'date':
          return value instanceof Date ? value : new Date(value);
        case 'array':
          return Array.isArray(value) ? value : [value];
        default:
          return value;
      }
    } catch (error) {
      console.error(`Transformation error for field ${mapping.tallyField}:`, error);
      return mapping.defaultValue;
    }
  }

  public async validateMappings(companyName: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      const config = await this.fieldMappingService.loadConfiguration();
      const stockMappings = config.stockItemMappings;
      
      // Get a sample stock item to validate field mappings
      const stockItems = await this.stockItemService.getStockItems(companyName, 1);
      
      if (stockItems.length === 0) {
        issues.push('No stock items found in Tally for validation');
        return { valid: false, issues };
      }
      
      const sampleItem = stockItems[0];
      
      // Check if mapped Tally fields exist
      for (const mapping of stockMappings) {
        const value = this.getTallyFieldValue(sampleItem, mapping.tallyField);
        
        if (value === undefined && mapping.required) {
          issues.push(`Required Tally field "${mapping.tallyField}" not found in stock items`);
        }
      }
      
      // Check for duplicate MongoDB field names
      const mongoFields = stockMappings.map(m => m.mongoField);
      const duplicates = mongoFields.filter((field, index) => mongoFields.indexOf(field) !== index);
      
      if (duplicates.length > 0) {
        issues.push(`Duplicate MongoDB field mappings: ${duplicates.join(', ')}`);
      }
      
      // Check for required productId mapping
      const hasProductIdMapping = stockMappings.some(m => m.mongoField === 'productId');
      if (!hasProductIdMapping) {
        issues.push('No mapping found for productId field (required for document identification)');
      }
      
    } catch (error) {
      issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}