import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@smarttraffic.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) return;

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: await bcrypt.hash('admin1234', 12),
      role: Role.ADMIN,
    },
  });

  console.log('Seeded admin user:', adminEmail);
}

main().catch(console.error).finally(() => prisma.$disconnect());
