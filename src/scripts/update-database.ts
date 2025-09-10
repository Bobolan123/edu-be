import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function updateDatabase() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('Synchronizing database schema...');
    await dataSource.synchronize(false); // Don't drop existing tables
    console.log('Database schema synchronized successfully!');

    console.log('Checking for orphaned orders without order courses...');
    const ordersWithoutCourses = await dataSource.query(`
      SELECT o.id, o."totalPrice", o.status 
      FROM "order" o 
      LEFT JOIN order_course oc ON o.id = oc."orderId" 
      WHERE oc.id IS NULL AND o.status = 'COMPLETED'
    `);

    if (ordersWithoutCourses.length > 0) {
      console.log(`Found ${ordersWithoutCourses.length} orders without course references`);
      console.log('These orders may need manual review:', ordersWithoutCourses);
    } else {
      console.log('No orphaned orders found.');
    }

  } catch (error) {
    console.error('Database update failed:', error);
  } finally {
    await app.close();
  }
}

updateDatabase();