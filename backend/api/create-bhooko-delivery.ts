import 'dotenv/config';
import { PrismaClient, DeliveryStatus, DeliveryEventType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is missing');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const orderId = '631f70fc-9d8a-4950-aa7b-8569c925e805';

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });

    if (!order) throw new Error('Order not found');
    if (order.status !== 'READY') {
      throw new Error(`Expected READY order, got ${order.status}`);
    }
    if (order.delivery) {
      console.log('Delivery already exists:', order.delivery.id);
      return;
    }

    const delivery = await prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({
        data: { orderId, status: DeliveryStatus.CREATED },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: created.id,
          type: DeliveryEventType.CREATED,
        },
      });

      return created;
    });

    console.log('Delivery created:', delivery.id);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
