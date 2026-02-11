import { Sequelize } from 'sequelize';
import config from '../config/env.js';
import defineModels from './schema.js';

/**
 * Sequelize instance
 */
const sequelize = new Sequelize(config.database.url, {
  logging: config.nodeEnv === 'development' ? console.log : false,
  dialect: config.database.url.startsWith('sqlite') ? 'sqlite' : 'postgres',
  storage: config.database.url.startsWith('sqlite') 
    ? config.database.url.replace('sqlite:', '') 
    : undefined,
});

// ADD THIS:
console.log('🔍 Using database:', config.database.url.substring(0, 30) + '...');
console.log('🔍 Dialect:', config.database.url.startsWith('sqlite') ? 'sqlite' : 'postgres');

/**
 * Initialize models
 */
const models = defineModels(sequelize);

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    throw error;
  }
}

/**
 * Sync database (create tables)
 */
export async function syncDatabase(force = false) {
  try {
    await sequelize.sync({ force });
    console.log(`✅ Database synced successfully${force ? ' (forced)' : ''}`);
    return true;
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeConnection() {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
  }
}

export { sequelize, models };
export default { sequelize, models, testConnection, syncDatabase, closeConnection };
