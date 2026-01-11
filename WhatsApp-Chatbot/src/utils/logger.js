/**
 * LOGGER UTILITY
 * 
 * Consistent logging with prefixes and formatting
 */

const EMOJIS = {
  info: '✅',
  warn: '⚠️',
  error: '❌',
  debug: '🔍',
  http: '🌐',
  db: '🗄️',
  ai: '🤖',
  msg: '💬'
};

/**
 * Format log message with timestamp and prefix
 */
function formatMessage(level, module, message) {
  const timestamp = new Date().toISOString();
  const emoji = EMOJIS[level] || '📝';
  return `${emoji} [${timestamp}] [${module}] ${message}`;
}

export const logger = {
  info: (module, message, ...args) => {
    console.log(formatMessage('info', module, message), ...args);
  },
  
  warn: (module, message, ...args) => {
    console.warn(formatMessage('warn', module, message), ...args);
  },
  
  error: (module, message, ...args) => {
    console.error(formatMessage('error', module, message), ...args);
  },
  
  debug: (module, message, ...args) => {
    if (process.env.DEBUG === 'true') {
      console.log(formatMessage('debug', module, message), ...args);
    }
  },
  
  http: (method, path, statusCode) => {
    console.log(`${EMOJIS.http} ${method} ${path} - ${statusCode}`);
  },
  
  /**
   * Log final response sent to user
   */
  response: (userId, type, content) => {
    console.log('\n✅ [FINAL RESPONSE]');
    console.log(`🎯 User ID: ${userId}`);
    console.log(`📝 Type: ${type}`);
    console.log(`📤 Content: ${typeof content === 'string' ? content : JSON.stringify(content)}`);
    console.log('━'.repeat(50));
  }
};
