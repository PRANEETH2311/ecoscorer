const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    // Default admin user
    const adminEmail = 'admin@example.com';
    const adminPassword = 'password123';
    const adminUsername = 'admin';

    const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    if (!existingUser) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const user = await prisma.user.create({
            data: {
                username: adminUsername,
                email: adminEmail,
                password: hashedPassword,
            },
        });
        console.log(`Created user with id: ${user.id}`);
    } else {
        console.log('Admin user already exists.');
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
