import fs from 'fs';
import path from 'path';
import { AppConfig } from '@mspr/shared';

const CONFIG_PATH = path.resolve(import.meta.dir, '../../data', 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  shares: [],
  port: 3000,
  security: {
    allowedIps: [],
    blockedIps: []
  },
  scanner: {
    excludeExts: ['tmp', 'log', 'torrent'],
    excludeNames: ['thumbs.db', 'desktop.ini', '$RECYCLE.BIN', '.git']
  }
};

export class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.load();
  }

  private load(): AppConfig {
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to load config, using defaults:', e);
      }
    }
    this.save(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  public save(config: AppConfig) {
    this.config = config;
    if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  }

  public get(): AppConfig {
    return this.config;
  }

  public watch() {
    if (!fs.existsSync(CONFIG_PATH)) return;
    console.log('[Config] Watching for changes...');
    fs.watch(CONFIG_PATH, (event) => {
      if (event === 'change') {
        console.log('[Config] File changed, reloading...');
        this.config = this.load();
      }
    });
  }
}

export const configManager = new ConfigManager();
configManager.watch();
