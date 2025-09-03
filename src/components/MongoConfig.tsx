// MongoDB Configuration Component - Updated to use Database Storage
import React, { useState, useEffect } from 'react';
import { Database, Check, X, Settings, AlertCircle, Loader2, TestTube } from 'lucide-react';
import { MongoConfiguration, MongoConfigDbService } from '../services/config/mongoConfigDb';
import { MongoService } from '../services/api/mongodb/mongoService';

interface MongoConfigProps {
  onConfigured?: (config: MongoConfiguration) => void;
  onClose?: () => void;
}

export const MongoConfig: React.FC<MongoConfigProps> = ({ onConfigured, onClose }) => {
  const [config, setConfig] = useState<MongoConfiguration>({
    connectionString: 'mongodb://localhost:27017',
    databaseName: 'tally_sync',
    collectionName: 'inventories',
    isActive: false,
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    connectionOptions: {}
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [useAdvanced, setUseAdvanced] = useState(false);

  const configService = MongoConfigDbService.getInstance();
  const mongoService = MongoService.getInstance();

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      const savedConfig = await configService.loadConfiguration();
      setConfig(savedConfig);
      
      // Check if using advanced connection string
      const parsed = configService.parseConnectionString(savedConfig.connectionString);
      setUseAdvanced(
        !!(parsed.username || parsed.password || savedConfig.ssl || savedConfig.replicaSet)
      );
    } catch (error) {
      console.error('Error loading MongoDB configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof MongoConfiguration, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setTestResult(null); // Clear test results when config changes
  };

  const handleAdvancedToggle = () => {
    setUseAdvanced(!useAdvanced);
    if (!useAdvanced) {
      // Parse current connection string to populate individual fields
      const parsed = configService.parseConnectionString(config.connectionString);
      setConfig(prev => ({ ...prev, ...parsed }));
    } else {
      // Build connection string from individual fields
      const connectionString = configService.buildConnectionString(config);
      setConfig(prev => ({ ...prev, connectionString }));
    }
  };

  const testConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      let testConfig = { ...config };
      
      if (!useAdvanced) {
        // Build connection string from individual fields
        testConfig.connectionString = configService.buildConnectionString(config);
      }

      const result = await mongoService.testConnection(testConfig);
      setTestResult(result);
      
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setIsSaving(true);

      let finalConfig = { ...config };
      
      if (!useAdvanced) {
        finalConfig.connectionString = configService.buildConnectionString(config);
      }

      finalConfig.isActive = testResult?.success || false;
      
      await configService.saveConfiguration(finalConfig);
      onConfigured?.(finalConfig);
      
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration to database');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading configuration from database...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-green-100 rounded-xl">
            <Database className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">MongoDB Configuration</h2>
            <p className="text-gray-600">Configure connection to your MongoDB database (stored in database)</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Connection Method Toggle */}
        <div className="flex items-center space-x-4 mb-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useAdvanced}
              onChange={handleAdvancedToggle}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Use connection string
            </span>
          </label>
          <div className="text-xs text-gray-500">
            Toggle for advanced MongoDB connection options
          </div>
        </div>

        {useAdvanced ? (
          /* Connection String Mode */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Connection String
              </label>
              <input
                type="text"
                value={config.connectionString}
                onChange={(e) => handleInputChange('connectionString', e.target.value)}
                onFocus={(e) => e.target.select()}
                onBlur={() => setTestResult(null)}
                placeholder="mongodb://username:password@host:port/database"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Full MongoDB connection string with authentication and options
              </p>
            </div>
          </div>
        ) : (
          /* Individual Fields Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Host
              </label>
              <input
                type="text"
                value={config.host || 'localhost'}
                onChange={(e) => handleInputChange('host', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Port
              </label>
              <input
                type="number"
                value={config.port || 27017}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username (Optional)
              </label>
              <input
                type="text"
                value={config.username || ''}
                onChange={(e) => handleInputChange('username', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password (Optional)
              </label>
              <input
                type="password"
                value={config.password || ''}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Database and Collection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Database Name
            </label>
            <input
              type="text"
              value={config.databaseName}
              onChange={(e) => handleInputChange('databaseName', e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Collection Name
            </label>
            <input
              type="text"
              value={config.collectionName}
              onChange={(e) => handleInputChange('collectionName', e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Test Connection */}
        <div className="flex items-center space-x-4">
          <button
            onClick={testConnection}
            disabled={isTesting || !config.connectionString}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          {testResult && (
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              testResult.success 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResult.success ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {testResult.success ? 'Connection successful!' : 'Connection failed'}
              </span>
            </div>
          )}
        </div>

        {testResult && !testResult.success && testResult.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Connection Error</h3>
                <p className="text-sm text-red-700 mt-1">{testResult.error}</p>
                <div className="text-xs text-red-600 mt-2">
                  <p>Common solutions:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Ensure MongoDB is running and accessible</li>
                    <li>Check if the host and port are correct</li>
                    <li>Verify username and password if using authentication</li>
                    <li>Check firewall settings and network connectivity</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Configuration will be saved to MongoDB database and encrypted
          </div>
          
          <div className="flex space-x-3">
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
              disabled={isSaving || !testResult?.success}
              className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};