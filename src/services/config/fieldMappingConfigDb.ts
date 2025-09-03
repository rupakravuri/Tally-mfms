// Field Mapping Configuration Service - Database Storage Version
import { MongoService } from '../api/mongodb/mongoService';

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
  _id?: string;
  companyName?: string; // Track per company if needed
  stockItemMappings: FieldMapping[];
  salesVoucherMappings: FieldMapping[];
  customFields: CustomField[];
  lastUpdated: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FieldMappingConfigDbService {
  private static instance: FieldMappingConfigDbService;
  private mongoService: MongoService;
  private readonly COLLECTION_NAME = 'field_mapping_configurations';

  private constructor() {
    this.mongoService = MongoService.getInstance();
  }

  public static getInstance(): FieldMappingConfigDbService {
    if (!FieldMappingConfigDbService.instance) {
      FieldMappingConfigDbService.instance = new FieldMappingConfigDbService();
    }
    return FieldMappingConfigDbService.instance;
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
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  public async loadConfiguration(companyName?: string): Promise<FieldMappingConfiguration> {
    try {
      // Try to get configuration from database via IPC
      const config = await this.mongoService.loadFieldMappingConfig(companyName);
      
      if (config) {
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
      console.error('Error loading field mapping configuration from database:', error);
    }
    
    // Return default configuration and try to save it
    const defaultConfig = this.getDefaultConfiguration();
    if (companyName) {
      defaultConfig.companyName = companyName;
    }
    
    try {
      await this.saveConfiguration(defaultConfig);
    } catch (saveError) {
      console.warn('Could not save default field mapping configuration to database:', saveError);
    }
    
    return defaultConfig;
  }

  public async saveConfiguration(config: FieldMappingConfiguration): Promise<void> {
    try {
      const configToSave = {
        ...config,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date(),
        version: config.version || '1.0.0'
      };

      // If this is a new config, set createdAt
      if (!config._id) {
        configToSave.createdAt = new Date();
      }

      // Save to database using IPC
      await this.mongoService.saveFieldMappingConfig(configToSave);
    } catch (error) {
      console.error('Error saving field mapping configuration to database:', error);
      throw new Error('Failed to save field mapping configuration to database');
    }
  }

  public async addFieldMapping(mapping: FieldMapping, type: 'stock' | 'voucher' = 'stock', companyName?: string): Promise<void> {
    const config = await this.loadConfiguration(companyName);
    
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

  public async removeFieldMapping(mappingId: string, type: 'stock' | 'voucher' = 'stock', companyName?: string): Promise<void> {
    const config = await this.loadConfiguration(companyName);
    
    if (type === 'stock') {
      config.stockItemMappings = config.stockItemMappings.filter(m => m.id !== mappingId);
    } else {
      config.salesVoucherMappings = config.salesVoucherMappings.filter(m => m.id !== mappingId);
    }
    
    await this.saveConfiguration(config);
  }

  public async addCustomField(customField: CustomField, companyName?: string): Promise<void> {
    const config = await this.loadConfiguration(companyName);
    
    // Remove existing field with same name
    config.customFields = config.customFields.filter(f => f.mongoField !== customField.mongoField);
    config.customFields.push(customField);
    
    await this.saveConfiguration(config);
  }

  public async removeCustomField(fieldName: string, companyName?: string): Promise<void> {
    const config = await this.loadConfiguration(companyName);
    config.customFields = config.customFields.filter(f => f.mongoField !== fieldName);
    await this.saveConfiguration(config);
  }

  public async getAllConfigurations(): Promise<FieldMappingConfiguration[]> {
    try {
      const configs = await this.mongoService.findDocuments(
        {}, 
        this.COLLECTION_NAME
      );
      return configs as FieldMappingConfiguration[] || [];
    } catch (error) {
      console.error('Error getting all field mapping configurations:', error);
      return [];
    }
  }

  public async getConfigurationsByCompany(companyName: string): Promise<FieldMappingConfiguration[]> {
    try {
      const configs = await this.mongoService.findDocuments(
        { companyName }, 
        this.COLLECTION_NAME
      );
      return configs as FieldMappingConfiguration[] || [];
    } catch (error) {
      console.error('Error getting configurations by company:', error);
      return [];
    }
  }

  public async exportConfiguration(filePath: string, companyName?: string): Promise<void> {
    const config = await this.loadConfiguration(companyName);
    // This would need to be implemented with a file writing mechanism
    // For now, we'll just return the config as it would be exported
    console.log('Export configuration:', JSON.stringify(config, null, 2));
  }

  public async importConfiguration(configData: FieldMappingConfiguration): Promise<void> {
    await this.saveConfiguration(configData);
  }
}