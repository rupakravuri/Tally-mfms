// Type definitions for Electron API in renderer process

export interface ElectronMongoAPI {
  loadConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<any>;
  testConnection: (config: any) => Promise<{ success: boolean; error?: string }>;
  connect: () => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<void>;
  insertDocument: (document: any, collectionName?: string) => Promise<any>;
  updateDocument: (filter: Record<string, any>, update: Record<string, any>, collectionName?: string, upsert?: boolean) => Promise<any>;
  findDocument: (filter: Record<string, any>, collectionName?: string) => Promise<any>;
  findDocuments: (filter: Record<string, any>, collectionName?: string) => Promise<any[]>;
  bulkUpsert: (documents: Array<{ filter: Record<string, any>; document: any }>, collectionName?: string) => Promise<any>;
  getCollectionStats: (collectionName?: string) => Promise<any>;
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  quitApp: () => Promise<void>;
  mongo: ElectronMongoAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    versions: {
      node: string;
      chrome: string;
      electron: string;
    };
  }
}

export {};