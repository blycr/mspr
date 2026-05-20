import fs from 'fs';
import path from 'path';
import { SCANNER_DEFAULT_EXCLUDE_EXTS, SCANNER_DEFAULT_EXCLUDE_NAMES, API_DEFAULT_PORT } from '@mspr/shared';
import type { AppConfig } from '@mspr/shared';
import { LOG_PREFIX } from '../constants/index.js';

const CONFIG_PATH = path.resolve(import.meta.dir, '../../data', 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  shares: [],
  port: API_DEFAULT_PORT,
  security: {
    allowedIps: [],
    blockedIps: []
  },
  scanner: {
    excludeExts: [...SCANNER_DEFAULT_EXCLUDE_EXTS],
    excludeNames: [...SCANNER_DEFAULT_EXCLUDE_NAMES]
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
        console.error(`${LOG_PREFIX.CONFIG} Failed to load config, using defaults:`, e);
      }
    }
    this.save(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  public save(config: AppConfig) {
    this.config = config;
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  }

  public get(): AppConfig {
    return this.config;
  }

  public watch() {
    if (!fs.existsSync(CONFIG_PATH)) return;
    console.log(`${LOG_PREFIX.CONFIG} Watching for changes...`);
    fs.watch(CONFIG_PATH, (event) => {
      if (event === 'change') {
        console.log(`${LOG_PREFIX.CONFIG} File changed, reloading...`);
        this.config = this.load();
      }
    });
  }
}

export const configManager = new ConfigManager();
configManager.watch();
