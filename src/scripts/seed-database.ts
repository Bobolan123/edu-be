import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedAllService } from '../common/database/seeders/seed-all.service';

async function bootstrap() {
  console.log('🚀 Initializing database seeder...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seeder = app.get(SeedAllService);
    const result = await seeder.seedAll();

    console.log('\n📊 Seeding Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`  Roles:       ${result.roles}`);
    console.log(`  Users:       ${result.users}`);
    console.log(`  Categories:  ${result.categories}`);
    console.log(`  Courses:     ${result.courses}`);
    console.log(`  Sections:    ${result.sections}`);
    console.log(`  Lectures:    ${result.lectures}`);
    console.log(`  Enrollments: ${result.enrollments}`);
    console.log(`  Reviews:     ${result.reviews}`);
    console.log(`  Orders:      ${result.orders}`);
    console.log(`  Carts:       ${result.carts}`);
    console.log(`  Tickets:     ${result.tickets}`);
    console.log('═══════════════════════════════════════\n');

    console.log('✅ All data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap()
  .then(() => {
    console.log('\n🎉 Seeder completed. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeder failed:', error);
    process.exit(1);
  });
