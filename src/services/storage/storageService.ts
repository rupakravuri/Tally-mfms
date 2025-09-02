// Storage Service - Browser/Electron Compatible
export class StorageService {
  private static instance: StorageService;
  private isElectron: boolean;

  private constructor() {
    this.isElectron = this.checkElectronEnvironment();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private checkElectronEnvironment(): boolean {
    try {
      // Modern Electron detection - check for electronAPI exposed by preload script
      if (typeof window !== 'undefined' && window.electronAPI) {
        return true;
      }
      // Fallback for older Electron versions
      return !!(window && window.require);
    } catch {
      return false;
    }
  }

  public async readFile(filePath: string): Promise<string | null> {
    try {
      if (this.isElectron) {
        const fs = window.require('fs');
        if (fs.existsSync(filePath)) {
          return fs.readFileSync(filePath, 'utf-8');
        }
      } else {
        // Browser fallback - use localStorage with file path as key
        const key = this.pathToKey(filePath);
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error('Error reading file:', error);
    }
    return null;
  }

  public async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      if (this.isElectron) {
        const fs = window.require('fs');
        const path = window.require('path');
        
        // Ensure directory exists
        const dir = path.dirname(filePath);
        try {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        } catch (dirError) {
          console.error('Error creating directory:', dirError);
          throw new Error(`Failed to create directory: ${dir}`);
        }
        
        // Write file with proper error handling
        try {
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log('Successfully wrote file:', filePath);
          return true;
        } catch (writeError) {
          console.error('Error writing file:', writeError);
          throw new Error(`Failed to write file: ${filePath}`);
        }
      } else {
        // Browser fallback - use localStorage
        const key = this.pathToKey(filePath);
        localStorage.setItem(key, content);
        return true;
      }
    } catch (error) {
      console.error('Error in writeFile:', error);
      return false;
    }
  }

  public async copyFile(sourcePath: string, destPath: string): Promise<boolean> {
    try {
      if (this.isElectron) {
        const fs = window.require('fs');
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          return true;
        }
      } else {
        // Browser fallback
        const content = await this.readFile(sourcePath);
        if (content) {
          return await this.writeFile(destPath, content);
        }
      }
    } catch (error) {
      console.error('Error copying file:', error);
    }
    return false;
  }

  public async fileExists(filePath: string): Promise<boolean> {
    try {
      if (this.isElectron) {
        const fs = window.require('fs');
        return fs.existsSync(filePath);
      } else {
        const key = this.pathToKey(filePath);
        return localStorage.getItem(key) !== null;
      }
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  public getConfigPath(): string {
    if (this.isElectron) {
      try {
        // Try modern Electron API first (via IPC)
        if (window.electronAPI) {
          // Use a standard path that works across different Electron versions
          const os = window.require?.('os');
          const path = window.require?.('path');
          if (os && path) {
            return path.join(os.homedir(), '.tally-field-extractor', 'config');
          }
        }
        
        // Fallback for older versions
        const electronApp = window.require('@electron/remote').app;
        const path = window.require('path');
        return path.join(electronApp.getPath('userData'), 'config');
      } catch (error) {
        console.warn('Could not get electron app path, using fallback:', error);
        // Use a predictable fallback path
        try {
          const os = window.require?.('os');
          const path = window.require?.('path');
          if (os && path) {
            return path.join(os.homedir(), '.tally-field-extractor', 'config');
          }
        } catch (fallbackError) {
          console.warn('Fallback config path also failed:', fallbackError);
        }
      }
    }
    return 'tally-config'; // Browser fallback prefix
  }

  private pathToKey(filePath: string): string {
    // Convert file path to localStorage key
    return `tally-config:${filePath.replace(/[/\\]/g, ':')}`;
  }

  public async ensureDirectory(dirPath: string): Promise<void> {
    if (this.isElectron) {
      try {
        const fs = window.require('fs');
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      } catch (error) {
        console.error('Error creating directory:', error);
      }
    }
    // No action needed for browser environment
  }
}