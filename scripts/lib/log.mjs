import fs from 'fs';
import path from 'path';

export function createLogWriter(tag, logDir) {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(logDir, `${tag}.log`);
  fs.writeFileSync(logFile, '');

  return {
    write(data) {
      fs.appendFileSync(logFile, data);
    },
    tail(lines = 30) {
      try {
        const content = fs.readFileSync(logFile, 'utf-8');
        const all = content.split('\n');
        return all.slice(-lines).join('\n');
      } catch {
        return '';
      }
    },
    get filePath() {
      return logFile;
    },
  };
}
