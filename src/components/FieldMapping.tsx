// Field Mapping Configuration Component
import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Plus, Trash2, Settings, Save, RefreshCw, 
  AlertCircle, CheckCircle, Database, FileText, Package 
} from 'lucide-react';
import { 
  FieldMapping, 
  CustomField, 
  FieldMappingConfigService, 
  FieldMappingConfiguration 
} from '../services/config/fieldMappingConfig';
import { StockItemApiService } from '../services/api/inventory/stockItemApiService';

interface FieldMappingProps {
  companyName: string;
  onSave?: (config: FieldMappingConfiguration) => void;
  onClose?: () => void;
}

export const FieldMapping: React.FC<FieldMappingProps> = ({ companyName, onSave, onClose }) => {
  const [config, setConfig] = useState<FieldMappingConfiguration>({
    stockItemMappings: [],
    salesVoucherMappings: [],
    customFields: [],
    lastUpdated: '',
    version: '1.0.0'
  });

  const [availableTallyFields, setAvailableTallyFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [activeTab, setActiveTab] = useState<'stock' | 'custom'>('stock');
  const [newMapping, setNewMapping] = useState<Partial<FieldMapping>>({});
  const [newCustomField, setNewCustomField] = useState<Partial<CustomField>>({});

  const configService = FieldMappingConfigService.getInstance();
  const stockItemService = new StockItemApiService();

  useEffect(() => {
    loadConfiguration();
    loadAvailableFields();
  }, [companyName]);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      const savedConfig = await configService.loadConfiguration();
      setConfig(savedConfig);
    } catch (error) {
      console.error('Error loading field mapping configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableFields = async () => {
    try {
      setIsLoadingFields(true);
      const fields = await stockItemService.getAvailableFields(companyName);
      setAvailableTallyFields(fields);
    } catch (error) {
      console.error('Error loading available Tally fields:', error);
      // Set some common fields as fallback
      setAvailableTallyFields([
        'GUID', 'NAME', 'ALIAS', 'PARENT', 'CATEGORY', 'STOCKUOM',
        'SALESPRICE', 'PURCHASEPRICE', 'MRP', 'OPENINGBALANCE', 'OPENINGVALUE',
        'COSTINGMETHOD', 'GSTAPPLICABLE', 'GSTHSNCODE', 'TAXTYPE'
      ]);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setIsSaving(true);
      await configService.saveConfiguration(config);
      onSave?.(config);
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const addFieldMapping = () => {
    if (!newMapping.tallyField || !newMapping.mongoField) {
      alert('Please select both Tally field and MongoDB field');
      return;
    }

    const mapping: FieldMapping = {
      id: `${newMapping.tallyField}-to-${newMapping.mongoField}`,
      tallyField: newMapping.tallyField!,
      mongoField: newMapping.mongoField!,
      dataType: newMapping.dataType || 'string',
      required: newMapping.required || false,
      description: newMapping.description || `Maps ${newMapping.tallyField} to ${newMapping.mongoField}`,
      transformation: newMapping.transformation
    };

    setConfig(prev => ({
      ...prev,
      stockItemMappings: [...prev.stockItemMappings.filter(m => m.id !== mapping.id), mapping]
    }));

    setNewMapping({});
  };

  const removeFieldMapping = (mappingId: string) => {
    setConfig(prev => ({
      ...prev,
      stockItemMappings: prev.stockItemMappings.filter(m => m.id !== mappingId)
    }));
  };

  const addCustomField = () => {
    if (!newCustomField.mongoField) {
      alert('Please enter MongoDB field name');
      return;
    }

    const customField: CustomField = {
      mongoField: newCustomField.mongoField!,
      dataType: newCustomField.dataType || 'string',
      defaultValue: newCustomField.defaultValue || '',
      description: newCustomField.description || `Custom field: ${newCustomField.mongoField}`
    };

    setConfig(prev => ({
      ...prev,
      customFields: [...prev.customFields.filter(f => f.mongoField !== customField.mongoField), customField]
    }));

    setNewCustomField({});
  };

  const removeCustomField = (fieldName: string) => {
    setConfig(prev => ({
      ...prev,
      customFields: prev.customFields.filter(f => f.mongoField !== fieldName)
    }));
  };

  const dataTypeOptions = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'array', label: 'Array' },
    { value: 'object', label: 'Object' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading field mappings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Settings className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Field Mapping Configuration</h2>
            <p className="text-gray-600">Map Tally fields to MongoDB documents for <strong>{companyName}</strong></p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'stock'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="h-4 w-4 inline mr-2" />
          Stock Item Mappings ({config.stockItemMappings.length})
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'custom'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Database className="h-4 w-4 inline mr-2" />
          Custom Fields ({config.customFields.length})
        </button>
      </div>

      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Add New Mapping */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Field Mapping</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tally Field
                </label>
                <select
                  value={newMapping.tallyField || ''}
                  onChange={(e) => setNewMapping(prev => ({ ...prev, tallyField: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select Tally Field</option>
                  {availableTallyFields.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MongoDB Field
                </label>
                <input
                  type="text"
                  value={newMapping.mongoField || ''}
                  onChange={(e) => setNewMapping(prev => ({ ...prev, mongoField: e.target.value }))}
                  placeholder="e.g., productId, name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Type
                </label>
                <select
                  value={newMapping.dataType || 'string'}
                  onChange={(e) => setNewMapping(prev => ({ ...prev, dataType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {dataTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={addFieldMapping}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newMapping.required || false}
                  onChange={(e) => setNewMapping(prev => ({ ...prev, required: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Required field</span>
              </label>
            </div>
          </div>

          {/* Existing Mappings */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Current Mappings</h3>
            {config.stockItemMappings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No field mappings configured yet</p>
                <p className="text-sm">Add your first mapping above</p>
              </div>
            ) : (
              config.stockItemMappings.map((mapping) => (
                <div key={mapping.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-blue-100 px-3 py-1 rounded-lg">
                        <span className="text-sm font-medium text-blue-800">{mapping.tallyField}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <div className="bg-green-100 px-3 py-1 rounded-lg">
                        <span className="text-sm font-medium text-green-800">{mapping.mongoField}</span>
                      </div>
                      <div className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                        {mapping.dataType}
                      </div>
                      {mapping.required && (
                        <div className="bg-red-100 px-2 py-1 rounded text-xs text-red-600">
                          Required
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFieldMapping(mapping.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {mapping.description && (
                    <p className="text-sm text-gray-600 mt-2 ml-2">{mapping.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="space-y-6">
          {/* Add Custom Field */}
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Field</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MongoDB Field Name
                </label>
                <input
                  type="text"
                  value={newCustomField.mongoField || ''}
                  onChange={(e) => setNewCustomField(prev => ({ ...prev, mongoField: e.target.value }))}
                  placeholder="e.g., fms_status, companies"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Type
                </label>
                <select
                  value={newCustomField.dataType || 'string'}
                  onChange={(e) => setNewCustomField(prev => ({ ...prev, dataType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                >
                  {dataTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Value
                </label>
                <input
                  type="text"
                  value={newCustomField.defaultValue || ''}
                  onChange={(e) => setNewCustomField(prev => ({ ...prev, defaultValue: e.target.value }))}
                  placeholder="Default value"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={addCustomField}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Existing Custom Fields */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Custom Fields</h3>
            {config.customFields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No custom fields configured yet</p>
                <p className="text-sm">Add custom MongoDB fields that don't exist in Tally</p>
              </div>
            ) : (
              config.customFields.map((field) => (
                <div key={field.mongoField} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-green-100 px-3 py-1 rounded-lg">
                        <span className="text-sm font-medium text-green-800">{field.mongoField}</span>
                      </div>
                      <div className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                        {field.dataType}
                      </div>
                      {field.defaultValue && (
                        <div className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-600">
                          Default: {String(field.defaultValue)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeCustomField(field.mongoField)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {field.description && (
                    <p className="text-sm text-gray-600 mt-2 ml-2">{field.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-8 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Last updated: {config.lastUpdated ? new Date(config.lastUpdated).toLocaleString() : 'Never'}
          {isLoadingFields && (
            <span className="ml-2 text-blue-600">
              <RefreshCw className="h-3 w-3 inline animate-spin mr-1" />
              Loading Tally fields...
            </span>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={loadAvailableFields}
            disabled={isLoadingFields}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingFields ? 'animate-spin' : ''}`} />
            <span>Refresh Fields</span>
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={saveConfiguration}
            disabled={isSaving}
            className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};