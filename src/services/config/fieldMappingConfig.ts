// Field Mapping Configuration Service - Cross-platform Storage
import { StorageService } from '../storage/storageService';

export interface FieldMapping {
  id: string;
  tallyField: string;
  mongoField: string;
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  required: boolean;
  transformation?: string; // JavaScript transformation code
  description: string;
  defaultValue?: any;
}

export interface CustomField {
  mongoField: string;
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  defaultValue: any;
  description: string;
}

export interface FieldMappingConfiguration {
  stockItemMappings: FieldMapping[];
  salesVoucherMappings: FieldMapping[];
  customFields: CustomField[];
  lastUpdated: string;
  version: string;
}

export class FieldMappingConfigService {
  private static instance: FieldMappingConfigService;
  private storageService: StorageService;
  private configPath: string;
  private backupPath: string;

  private constructor() {
    this.storageService = StorageService.getInstance();
    const configDir = this.storageService.getConfigPath();
    this.configPath = `${configDir}/field-mappings.json`;
    this.backupPath = `${configDir}/backup/field-mappings-backup.json`;
  }

  public static getInstance(): FieldMappingConfigService {
    if (!FieldMappingConfigService.instance) {
      FieldMappingConfigService.instance = new FieldMappingConfigService();
    }
    return FieldMappingConfigService.instance;
  }

  private getDefaultConfiguration(): FieldMappingConfiguration {
    return {
      stockItemMappings: [
        {
          id: 'guid-to-productId',
          tallyField: 'GUID',
          mongoField: 'productId',
          dataType: 'string',
          required: true,
          description: 'Maps Tally GUID to MongoDB productId'
        },
        {
          id: 'name-mapping',
          tallyField: 'NAME',
          mongoField: 'name',
          dataType: 'string',
          required: true,
          description: 'Maps Tally NAME to MongoDB name'
        },
        {
          id: 'salesprice-mapping',
          tallyField: 'SALESPRICE',
          mongoField: 'salesPrice',
          dataType: 'number',
          required: false,
          description: 'Maps Tally sales price to MongoDB salesPrice'
        },
        {
          id: 'stockuom-mapping',
          tallyField: 'STOCKUOM',
          mongoField: 'unit',
          dataType: 'string',
          required: false,
          description: 'Maps Tally stock UOM to MongoDB unit'
        }
      ],
      salesVoucherMappings: [],
      customFields: [
        {
          mongoField: 'fms_status',
          dataType: 'boolean',
          defaultValue: true,
          description: 'FMS status flag'
        },
        {
          mongoField: 'date',
          dataType: 'date',
          defaultValue: new Date().toISOString(),
          description: 'Record creation/update date'
        },
        {
          mongoField: 'companies',
          dataType: 'array',
          defaultValue: [],
          description: 'Associated company IDs'
        },
        {
          mongoField: 'product',
          dataType: 'array',
          defaultValue: [],
          description: 'Product category codes'
        }
      ],
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  public async loadConfiguration(): Promise<FieldMappingConfiguration> {
    try {
      const configData = await this.storageService.readFile(this.configPath);
      if (configData) {
        const config = JSON.parse(configData) as FieldMappingConfiguration;
        
        // Validate and merge with defaults if needed
        const defaultConfig = this.getDefaultConfiguration();
        return {
          ...defaultConfig,
          ...config,
          stockItemMappings: config.stockItemMappings || defaultConfig.stockItemMappings,
          customFields: config.customFields || defaultConfig.customFields
        };
      }
    } catch (error) {
      console.error('Error loading field mapping configuration:', error);
      // Try loading from backup
      const backupData = await this.storageService.readFile(this.backupPath);
      if (backupData) {
        try {
          return JSON.parse(backupData) as FieldMappingConfiguration;
        } catch (backupError) {
          console.error('Error loading backup configuration:', backupError);
        }
      }
    }
    
    // Return default configuration
    const defaultConfig = this.getDefaultConfiguration();
    await this.saveConfiguration(defaultConfig);
    return defaultConfig;
  }

  public async saveConfiguration(config: FieldMappingConfiguration): Promise<void> {
    try {
      // Create backup first
      const currentConfig = await this.storageService.readFile(this.configPath);
      if (currentConfig) {
        await this.storageService.writeFile(this.backupPath, currentConfig);
      }

      // Update timestamp
      config.lastUpdated = new Date().toISOString();

      // Save configuration
      const success = await this.storageService.writeFile(
        this.configPath, 
        JSON.stringify(config, null, 2)
      );
      
      if (!success) {
        throw new Error('Failed to write configuration file');
      }
    } catch (error) {
      console.error('Error saving field mapping configuration:', error);
      throw new Error('Failed to save field mapping configuration');
    }
  }

  public async addFieldMapping(mapping: FieldMapping, type: 'stock' | 'voucher' = 'stock'): Promise<void> {
    const config = await this.loadConfiguration();
    
    if (type === 'stock') {
      // Remove existing mapping with same ID
      config.stockItemMappings = config.stockItemMappings.filter(m => m.id !== mapping.id);
      config.stockItemMappings.push(mapping);
    } else {
      config.salesVoucherMappings = config.salesVoucherMappings.filter(m => m.id !== mapping.id);
      config.salesVoucherMappings.push(mapping);
    }
    
    await this.saveConfiguration(config);
  }

  public async removeFieldMapping(mappingId: string, type: 'stock' | 'voucher' = 'stock'): Promise<void> {
    const config = await this.loadConfiguration();
    
    if (type === 'stock') {
      config.stockItemMappings = config.stockItemMappings.filter(m => m.id !== mappingId);
    } else {
      config.salesVoucherMappings = config.salesVoucherMappings.filter(m => m.id !== mappingId);
    }
    
    await this.saveConfiguration(config);
  }

  public async addCustomField(customField: CustomField): Promise<void> {
    const config = await this.loadConfiguration();
    
    // Remove existing field with same name
    config.customFields = config.customFields.filter(f => f.mongoField !== customField.mongoField);
    config.customFields.push(customField);
    
    await this.saveConfiguration(config);
  }

  public async removeCustomField(fieldName: string): Promise<void> {
    const config = await this.loadConfiguration();
    config.customFields = config.customFields.filter(f => f.mongoField !== fieldName);
    await this.saveConfiguration(config);
  }

  public async exportConfiguration(filePath: string): Promise<void> {
    const config = await this.loadConfiguration();
    await this.storageService.writeFile(filePath, JSON.stringify(config, null, 2));
  }

  public async importConfiguration(filePath: string): Promise<void> {
    const configData = await this.storageService.readFile(filePath);
    if (configData) {
      const config = JSON.parse(configData) as FieldMappingConfiguration;
      await this.saveConfiguration(config);
    } else {
      throw new Error('Configuration file not found or could not be read');
    }
  }
}