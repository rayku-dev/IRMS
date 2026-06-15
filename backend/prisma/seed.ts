import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'admin',
    },
  });
  console.log(`Created admin user: ${adminUser.username}`);

  // 2. Create Section Types (The categories that sections belong to)
  const types = ['storage', 'form', 'archive', 'office', 'warehouse'];
  for (const type of types) {
    await prisma.sectionType.upsert({
      where: { name: type },
      update: {},
      create: { name: type },
    });
  }
  console.log('Created section types');

  console.log('Seeding finished. No default sections were created as per user preference.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
