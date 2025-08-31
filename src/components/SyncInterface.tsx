// Sync Interface Component for Tally to MongoDB
import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Play, Pause, CheckCircle, AlertCircle, Database, 
  Settings, FileText, BarChart3, Clock, TrendingUp, Activity
} from 'lucide-react';
import { TallySyncService, SyncProgress, SyncOptions } from '../services/api/sync/tallySyncService';
import { MongoService } from '../services/api/mongodb/mongoService';
import { FieldMappingConfigService } from '../services/config/fieldMappingConfig';

interface SyncInterfaceProps {
  companyName: string;
  onConfigureFields?: () => void;
  onConfigureMongo?: () => void;
}

export const SyncInterface: React.FC<SyncInterfaceProps> = ({ 
  companyName, 
  onConfigureFields, 
  onConfigureMongo 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; issues: string[] } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [syncOptions, setSyncOptions] = useState({
    batchSize: 100,
    dryRun: false
  });

  const syncService = TallySyncService.getInstance();
  const mongoService = MongoService.getInstance();
  const fieldMappingService = FieldMappingConfigService.getInstance();

  useEffect(() => {
    checkConnections();
    validateMappings();
  }, [companyName]);

  const checkConnections = async () => {
    try {
      const mongoStatus = mongoService.getConnectionStatus();
      setIsConnected(mongoStatus.connected);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const validateMappings = async () => {
    try {
      setIsValidating(true);
      const result = await syncService.validateMappings(companyName);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        valid: false,
        issues: [error instanceof Error ? error.message : 'Validation failed']
      });
    } finally {
      setIsValidating(false);
    }
  };

  const startSync = async () => {
    if (!isConnected || !validationResult?.valid) {
      return;
    }

    try {
      setIsSyncing(true);
      setProgress(null);
      setLastSyncResult(null);

      const options: SyncOptions = {
        companyName,
        batchSize: syncOptions.batchSize,
        dryRun: syncOptions.dryRun,
        onProgress: (progress) => {
          setProgress(progress);
        }
      };

      const result = await syncService.syncStockItems(options);
      setLastSyncResult(result);
      
      // Add to sync history
      setSyncHistory(prev => [{
        timestamp: new Date().toISOString(),
        result,
        dryRun: syncOptions.dryRun
      }, ...prev.slice(0, 9)]); // Keep last 10 syncs

    } catch (error) {
      setLastSyncResult({
        success: false,
        inserted: 0,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
        totalProcessed: 0
      });
    } finally {
      setIsSyncing(false);
      setProgress(null);
    }
  };

  const getProgressColor = (phase: string) => {
    switch (phase) {
      case 'connecting': return 'text-blue-600';
      case 'fetching': return 'text-purple-600';
      case 'mapping': return 'text-yellow-600';
      case 'syncing': return 'text-green-600';
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'connecting': return <Database className="h-4 w-4" />;
      case 'fetching': return <FileText className="h-4 w-4" />;
      case 'mapping': return <Settings className="h-4 w-4" />;
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <RefreshCw className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tally → MongoDB Sync</h2>
              <p className="text-gray-600">Sync stock items from <strong>{companyName}</strong> to MongoDB</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium">
                {isConnected ? 'MongoDB Connected' : 'MongoDB Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Status */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Configuration Status</h3>
          <button
            onClick={validateMappings}
            disabled={isValidating}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            <span>Validate</span>
          </button>
        </div>

        {validationResult && (
          <div className={`p-4 rounded-xl border ${
            validationResult.valid 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start space-x-3">
              {validationResult.valid ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-semibold ${
                  validationResult.valid ? 'text-green-800' : 'text-red-800'
                }`}>
                  {validationResult.valid ? 'Configuration Valid' : 'Configuration Issues'}
                </h4>
                {validationResult.issues.length > 0 && (
                  <ul className={`text-sm mt-2 space-y-1 ${
                    validationResult.valid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {validationResult.issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-3 mt-4">
          <button
            onClick={onConfigureMongo}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center space-x-2"
          >
            <Database className="h-4 w-4" />
            <span>Configure MongoDB</span>
          </button>
          <button
            onClick={onConfigureFields}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Configure Field Mapping</span>
          </button>
        </div>
      </div>

      {/* Sync Control */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Control</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Size
            </label>
            <input
              type="number"
              value={syncOptions.batchSize}
              onChange={(e) => setSyncOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
              min="1"
              max="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Records to process per batch</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={syncOptions.dryRun}
                onChange={(e) => setSyncOptions(prev => ({ ...prev, dryRun: e.target.checked }))}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Dry Run</span>
            </label>
            <div className="text-xs text-gray-500">
              Test without writing to MongoDB
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={startSync}
              disabled={isSyncing || !isConnected || !validationResult?.valid}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Start Sync</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress */}
        {progress && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={getProgressColor(progress.phase)}>
                  {getPhaseIcon(progress.phase)}
                </div>
                <span className="font-medium text-gray-900 capitalize">{progress.phase}</span>
              </div>
              <span className="text-sm text-gray-600">{progress.progress}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            
            <p className="text-sm text-gray-700">{progress.message}</p>
            
            {progress.current && progress.total && (
              <p className="text-xs text-gray-500 mt-1">
                Processing {progress.current} of {progress.total}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Last Sync Result */}
      {lastSyncResult && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Result</h3>
          
          <div className={`p-4 rounded-xl border ${
            lastSyncResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{lastSyncResult.inserted}</div>
                <div className="text-sm text-gray-600">Inserted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{lastSyncResult.updated}</div>
                <div className="text-sm text-gray-600">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{lastSyncResult.totalProcessed}</div>
                <div className="text-sm text-gray-600">Total Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{lastSyncResult.errors.length}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>

            {lastSyncResult.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-red-800 mb-2">Errors:</h4>
                <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                  {lastSyncResult.errors.slice(0, 10).map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {lastSyncResult.errors.length > 10 && (
                    <li className="text-gray-600">... and {lastSyncResult.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync History */}
      {syncHistory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Syncs</h3>
          
          <div className="space-y-3">
            {syncHistory.slice(0, 5).map((sync, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {new Date(sync.timestamp).toLocaleString()}
                  </span>
                  {sync.dryRun && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      Dry Run
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-green-600">+{sync.result.inserted}</span>
                  <span className="text-blue-600">~{sync.result.updated}</span>
                  <span className="text-gray-600">{sync.result.totalProcessed} total</span>
                  {sync.result.errors.length > 0 && (
                    <span className="text-red-600">{sync.result.errors.length} errors</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};