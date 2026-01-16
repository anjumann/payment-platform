import { connect, connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed Script
 * 
 * Creates sample tenants for testing the multi-tenant platform.
 * Run with: npx ts-node src/scripts/seed.ts
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/payment-platform?authSource=admin';

async function seed() {
  console.log('🌱 Starting database seed...');
  
  await connect(MONGODB_URI);
  console.log('📦 Connected to MongoDB');

  const db = connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }
  const tenantsCollection = db.collection('tenants');

  // Clear existing tenants
  await tenantsCollection.deleteMany({});
  console.log('🧹 Cleared existing tenants');

  // Sample tenants for each tier
  const tenants = [
    {
      slug: 'bank1',
      name: 'First National Bank',
      tier: 'enterprise',
      domains: ['payments.firstnational.com'],
      settings: {
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        defaultLanguage: 'en',
        timezone: 'America/New_York',
        defaultCurrency: 'USD',
      },
      isActive: true,
      apiKey: `pat_${uuidv4().replace(/-/g, '')}`,
      adminEmail: 'admin@firstnational.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      slug: 'fintech-pro',
      name: 'FinTech Pro Solutions',
      tier: 'professional',
      domains: [],
      settings: {
        primaryColor: '#2e7d32',
        secondaryColor: '#f57c00',
        defaultLanguage: 'en',
        timezone: 'UTC',
        defaultCurrency: 'EUR',
      },
      isActive: true,
      apiKey: `pat_${uuidv4().replace(/-/g, '')}`,
      adminEmail: 'admin@fintechpro.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      slug: 'startup-pay',
      name: 'Startup Payments Inc',
      tier: 'starter',
      domains: [],
      settings: {
        primaryColor: '#7b1fa2',
        secondaryColor: '#0288d1',
        defaultLanguage: 'en',
        timezone: 'America/Los_Angeles',
        defaultCurrency: 'USD',
      },
      isActive: true,
      apiKey: `pat_${uuidv4().replace(/-/g, '')}`,
      adminEmail: 'admin@startuppay.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await tenantsCollection.insertMany(tenants);
  console.log(`✅ Created ${tenants.length} sample tenants:`);
  
  tenants.forEach((t) => {
    console.log(`   - ${t.name} (${t.slug}) [${t.tier}]`);
    console.log(`     API Key: ${t.apiKey}`);
  });

  await connection.close();
  console.log('\n🎉 Seed completed successfully!');
  console.log('\nTry these commands:');
  console.log('  curl -H "X-Tenant-ID: <api-key>" http://localhost:3000/api/tenants/current');
  console.log('  curl -H "Host: bank1.localhost:3000" http://localhost:3000/api/tenants/current');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
