import {

  ConflictException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';



import {

  DeliveryAssignmentStatus,

  DeliveryEventType,

  DeliveryStatus,

  OrderStatus,

  RiderAvailability,

  RiderStatus,

} from '@prisma/client';



import { PrismaService } from '../../prisma/prisma.service';

import { RealtimeService } from '../../realtime/services/realtime.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/enums/notification-type.enum';



@Injectable()

export class AssignmentService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly realtimeService: RealtimeService,

    private readonly notificationsService: NotificationsService,

  ) {}



  async assignRider(

    deliveryId: string,

    riderId: string,

  ) {

    const delivery = await this.prisma.delivery.findUnique({

      where: { id: deliveryId },

      include: {
        order: {
    select: {
      customerId: true,
    },
  },
        rider: true,

        assignments: {

          where: {

            status: {

              in: [

                DeliveryAssignmentStatus.PENDING,

                DeliveryAssignmentStatus.ACCEPTED,

              ],

            },

          },

        },

      },

    });



    if (!delivery) {

      throw new NotFoundException('Delivery not found');

    }



    if (delivery.status !== DeliveryStatus.CREATED) {

      throw new ConflictException(

        'Delivery is not available for assignment',

      );

    }



    if (delivery.riderId) {

      throw new ConflictException(

        'Delivery already has a rider assigned',

      );

    }



    if (delivery.assignments.length > 0) {

      throw new ConflictException(

        'Delivery already has an active assignment',

      );

    }



    const rider = await this.prisma.rider.findUnique({

      where: { id: riderId },

    });



    if (!rider) {

      throw new NotFoundException('Rider not found');

    }



    if (rider.status !== RiderStatus.ACTIVE) {

      throw new ConflictException(

        'Rider must be active before assignment',

      );

    }



    if (rider.availability !== RiderAvailability.ONLINE) {

      throw new ConflictException(

        'Rider must be online before assignment',

      );

    }



    const activeDelivery =

      await this.prisma.delivery.findFirst({

        where: {

          riderId,

          status: {

            notIn: [

              DeliveryStatus.DELIVERED,

              DeliveryStatus.FAILED,

              DeliveryStatus.CANCELLED,

            ],

          },

        },

        select: {

          id: true,

        },

      });



    if (activeDelivery) {

      throw new ConflictException(

        'Rider already has an active delivery',

      );

    }



    const assignment = await this.prisma.$transaction(

      async (tx) => {

        const newAssignment =

          await tx.deliveryAssignment.create({

            data: {

              deliveryId,

              riderId,

              status: DeliveryAssignmentStatus.PENDING,

            },

          });



        await tx.delivery.update({

          where: { id: deliveryId },

          data: {

            riderId,

            status: DeliveryStatus.ASSIGNED,

          },

        });



        await tx.rider.update({

          where: { id: riderId },

          data: {

            availability: RiderAvailability.ASSIGNED,

          },

        });



        await tx.deliveryEvent.create({

          data: {

            deliveryId,

            type: DeliveryEventType.ASSIGNED,

            metadata: {

              riderId,

              assignmentId: newAssignment.id,

            },

          },

        });



        return newAssignment;

      },

    );



    this.realtimeService.emitDeliveryRiderAssigned(
      deliveryId,
      DeliveryStatus.ASSIGNED,
      {
        orderId: delivery.orderId,
        riderId,
        assignmentId: assignment.id,
      },
    );

    await this.notificationsService.createIfNotExists({
  recipientUserId: delivery.order.customerId,
  type: NotificationType.RIDER_ASSIGNED,
  title: 'Rider Assigned',
  message: 'A rider has been assigned to your order.',
  relatedEntityType: 'DELIVERY',
  relatedEntityId: deliveryId,
});

    return assignment;

  }



  async acceptAssignment(assignmentId: string) {

    const assignment =

      await this.prisma.deliveryAssignment.findUnique({

        where: {

          id: assignmentId,

        },

        include: {

          delivery: {
  select: {
    id: true,
    status: true,
    order: {
      select: {
        customerId: true,
      },
    },
  },
},

          rider: {

            select: {

              id: true,

              availability: true,

            },

          },

        },

      });



    if (!assignment) {

      throw new NotFoundException(

        'Delivery assignment not found',

      );

    }



    if (

      assignment.status !==

      DeliveryAssignmentStatus.PENDING

    ) {

      throw new ConflictException(

        'Only pending assignments can be accepted',

      );

    }



    if (

      assignment.delivery.status !==

      DeliveryStatus.ASSIGNED

    ) {

      throw new ConflictException(

        'Delivery is not available for acceptance',

      );

    }



    if (

      assignment.rider.availability !==

      RiderAvailability.ASSIGNED

    ) {

      throw new ConflictException(

        'Rider is not assigned to this delivery',

      );

    }



    const updatedAssignment =

      await this.prisma.$transaction(async (tx) => {

        const updatedAssignment =

          await tx.deliveryAssignment.update({

            where: {

              id: assignmentId,

            },

            data: {

              status: DeliveryAssignmentStatus.ACCEPTED,

              acceptedAt: new Date(),

            },

          });



        await tx.delivery.update({

          where: {

            id: assignment.deliveryId,

          },

          data: {

            status: DeliveryStatus.RIDER_ACCEPTED,

          },

        });



        await tx.rider.update({

          where: {

            id: assignment.riderId,

          },

          data: {

            availability: RiderAvailability.ON_DELIVERY,

          },

        });



        await tx.deliveryEvent.create({

          data: {

            deliveryId: assignment.deliveryId,

            type: DeliveryEventType.ACCEPTED,

            metadata: {

              riderId: assignment.riderId,

              assignmentId: assignment.id,

            },

          },

        });



        return updatedAssignment;

      });



    this.realtimeService.emitDeliveryRiderAccepted(
      assignment.deliveryId,
      DeliveryStatus.RIDER_ACCEPTED,
      {
        riderId: assignment.riderId,
        assignmentId: updatedAssignment.id,
      },
    );
    
    await this.notificationsService.createIfNotExists({
  recipientUserId: assignment.delivery.order.customerId,
  type: NotificationType.RIDER_ACCEPTED,
  title: 'Rider Accepted',
  message: 'Your assigned rider has accepted the delivery.',
  relatedEntityType: 'DELIVERY',
  relatedEntityId: assignment.delivery.id,
});


    return updatedAssignment;

  }



  async rejectAssignment(assignmentId: string) {

    const assignment =

      await this.prisma.deliveryAssignment.findUnique({

        where: { id: assignmentId },

        include: {

          delivery: true,

          rider: true,

        },

      });



    if (!assignment) {

      throw new NotFoundException('Assignment not found');

    }



    if (

      assignment.status !==

      DeliveryAssignmentStatus.PENDING

    ) {

      throw new ConflictException(

        'Assignment is not pending',

      );

    }



    if (

      assignment.delivery.status !==

      DeliveryStatus.ASSIGNED

    ) {

      throw new ConflictException(

        'Delivery is not available for rejection',

      );

    }



    if (

      assignment.rider.availability !==

      RiderAvailability.ASSIGNED

    ) {

      throw new ConflictException(

        'Rider is not assigned to this delivery',

      );

    }



    const rejectedAssignment =

      await this.prisma.$transaction(async (tx) => {

        const rejectedAssignment =

          await tx.deliveryAssignment.update({

            where: {

              id: assignmentId,

            },

            data: {

              status: DeliveryAssignmentStatus.REJECTED,

              rejectedAt: new Date(),

            },

          });



        await tx.delivery.update({

          where: {

            id: assignment.deliveryId,

          },

          data: {

            riderId: null,

            status: DeliveryStatus.CREATED,

          },

        });



        await tx.rider.update({

          where: {

            id: assignment.riderId,

          },

          data: {

            availability: RiderAvailability.ONLINE,

          },

        });



        await tx.deliveryEvent.create({

          data: {

            deliveryId: assignment.deliveryId,

            type: DeliveryEventType.REJECTED,

            metadata: {

              riderId: assignment.riderId,

              assignmentId,

            },

          },

        });



        return rejectedAssignment;

      });



    this.realtimeService.emitDeliveryAssignmentRejected(
      assignment.deliveryId,
      DeliveryStatus.CREATED,
      {
        riderId: assignment.riderId,
        assignmentId,
      },
    );



    return rejectedAssignment;

  }



  async arriveAtRestaurant(assignmentId: string) {

    const assignment =

      await this.prisma.deliveryAssignment.findUnique({

        where: {

          id: assignmentId,

        },

        include: {
  delivery: {
    include: {
      order: {
        select: {
          customerId: true,
        },
      },
    },
  },
  rider: true,
},

      });



    if (!assignment) {

      throw new NotFoundException(

        'Delivery assignment not found',

      );

    }



    if (

      assignment.status !==

      DeliveryAssignmentStatus.ACCEPTED

    ) {

      throw new ConflictException(

        'Only accepted assignments can mark arrival',

      );

    }



    if (

      assignment.delivery.status !==

      DeliveryStatus.RIDER_ACCEPTED

    ) {

      throw new ConflictException(

        'Delivery is not ready for restaurant arrival',

      );

    }



    if (

      assignment.rider.availability !==

      RiderAvailability.ON_DELIVERY

    ) {

      throw new ConflictException(

        'Rider must be on delivery before arrival',

      );

    }



    const delivery = await this.prisma.$transaction(

      async (tx) => {

        const updatedDelivery =

          await tx.delivery.update({

            where: {

              id: assignment.deliveryId,

            },

            data: {

              status:

                DeliveryStatus.ARRIVED_AT_RESTAURANT,

            },

          });



          await tx.order.update({

  where: {

    id: assignment.delivery.orderId,

  },

  data: {

    status: OrderStatus.DELIVERED,

  },

});



        await tx.deliveryEvent.create({

          data: {

            deliveryId: assignment.deliveryId,

            type: DeliveryEventType.ARRIVED,

            metadata: {

              riderId: assignment.riderId,

              assignmentId,

            },

          },

        });



        return updatedDelivery;

      },

    );



    this.realtimeService.emitDeliveryArrivedAtRestaurant(
      assignment.deliveryId,
      DeliveryStatus.ARRIVED_AT_RESTAURANT,
      {
        riderId: assignment.riderId,
        assignmentId,
      },
    );

    await this.notificationsService.createIfNotExists({
  recipientUserId: assignment.delivery.order.customerId,
  type: NotificationType.ARRIVED_AT_RESTAURANT,
  title: 'Rider Arrived',
  message: 'Your rider has arrived at the restaurant and is waiting for your order.',
  relatedEntityType: 'DELIVERY',
  relatedEntityId: assignment.deliveryId,
});


    return delivery;

  }



  async pickupDelivery(assignmentId: string) {

    const assignment =

      await this.prisma.deliveryAssignment.findUnique({

        where: {

          id: assignmentId,

        },

        include: {
  delivery: {
    include: {
      order: {
        select: {
          customerId: true,
        },
      },
    },
  },
  rider: true,
},

      });



    if (!assignment) {

      throw new NotFoundException(

        'Delivery assignment not found',

      );

    }



    if (

      assignment.status !==

      DeliveryAssignmentStatus.ACCEPTED

    ) {

      throw new ConflictException(

        'Only accepted assignments can pick up delivery',

      );

    }



    if (

      assignment.delivery.status !==

      DeliveryStatus.ARRIVED_AT_RESTAURANT

    ) {

      throw new ConflictException(

        'Delivery is not ready for pickup',

      );

    }



    if (

      assignment.rider.availability !==

      RiderAvailability.ON_DELIVERY

    ) {

      throw new ConflictException(

        'Rider must be on delivery before pickup',

      );

    }



    const pickupAt = new Date();



    const delivery =

      await this.prisma.$transaction(async (tx) => {

        const updatedDelivery =

          await tx.delivery.update({

            where: {

              id: assignment.deliveryId,

            },

            data: {

              status: DeliveryStatus.PICKED_UP,

              pickupAt,

            },

          });



        await tx.deliveryEvent.create({

          data: {

            deliveryId: assignment.deliveryId,

            type: DeliveryEventType.PICKED_UP,

            metadata: {

              riderId: assignment.riderId,

              assignmentId,

            },

          },

        });



        return updatedDelivery;

      });



    this.realtimeService.emitDeliveryPickedUp(
      assignment.deliveryId,
      DeliveryStatus.PICKED_UP,
      {
        riderId: assignment.riderId,
        pickupAt: pickupAt.toISOString(),
      },
    );

    await this.notificationsService.createIfNotExists({
  recipientUserId: assignment.delivery.order.customerId,
  type: NotificationType.ORDER_PICKED_UP,
  title: 'Order Picked Up',
  message: 'Your order has been picked up by the rider.',
  relatedEntityType: 'DELIVERY',
  relatedEntityId: assignment.deliveryId,
});


    return delivery;

  }



  async outForDelivery(assignmentId: string) {

    const assignment =

      await this.prisma.deliveryAssignment.findUnique({

        where: {

          id: assignmentId,

        },

        include: {

          delivery: true,

          rider: true,

        },

      });



    if (!assignment) {

      throw new NotFoundException(

        'Delivery assignment not found',

      );

    }



    if (

      assignment.status !==

      DeliveryAssignmentStatus.ACCEPTED

    ) {

      throw new ConflictException(

        'Only accepted assignments can go out for delivery',

      );

    }



    if (

      assignment.delivery.status !==

      DeliveryStatus.PICKED_UP

    ) {

      throw new ConflictException(

        'Delivery is not ready to go out for delivery',

      );

    }



    if (

      assignment.rider.availability !==

      RiderAvailability.ON_DELIVERY

    ) {

      throw new ConflictException(

        'Rider must be on delivery before going out for delivery',

      );

    }



    const outForDeliveryAt = new Date();



    const delivery =

      await this.prisma.$transaction(async (tx) => {

        const updatedDelivery =

          await tx.delivery.update({

            where: {

              id: assignment.deliveryId,

            },

            data: {

              status: DeliveryStatus.OUT_FOR_DELIVERY,

              outForDeliveryAt,

            },

          });



        await tx.deliveryEvent.create({

          data: {

            deliveryId: assignment.deliveryId,

            type: DeliveryEventType.OUT_FOR_DELIVERY,

            metadata: {

              riderId: assignment.riderId,

              assignmentId,

            },

          },

        });



        return updatedDelivery;

      });



    this.realtimeService.emitDeliveryOutForDelivery(
      assignment.deliveryId,
      DeliveryStatus.OUT_FOR_DELIVERY,
      {
        riderId: assignment.riderId,
        outForDeliveryAt: outForDeliveryAt.toISOString(),
      },
    );



    return delivery;

  }



  async completeDelivery(assignmentId: string) {

    const assignment =

      await this.prisma.deliveryAssignment.findUnique({

        where: {

          id: assignmentId,

        },

        include: {

          delivery: true,

          rider: true,

        },

      });



    if (!assignment) {

      throw new NotFoundException(

        'Delivery assignment not found',

      );

    }



    if (

      assignment.status !==

      DeliveryAssignmentStatus.ACCEPTED

    ) {

      throw new ConflictException(

        'Only accepted assignments can complete delivery',

      );

    }



    if (

      assignment.delivery.status !==

      DeliveryStatus.OUT_FOR_DELIVERY

    ) {

      throw new ConflictException(

        'Delivery is not out for delivery',

      );

    }



    if (

      assignment.rider.availability !==

      RiderAvailability.ON_DELIVERY

    ) {

      throw new ConflictException(

        'Rider must be on delivery before completing delivery',

      );

    }



    const deliveredAt = new Date();



    const delivery = await this.prisma.$transaction(

      async (tx) => {

        const updatedDelivery =

          await tx.delivery.update({

            where: {

              id: assignment.deliveryId,

            },

            data: {

              status: DeliveryStatus.DELIVERED,

              deliveredAt,

            },

          });



        await tx.order.update({

          where: {

            id: assignment.delivery.orderId,

          },

          data: {

            status: OrderStatus.DELIVERED,

          },

        });



        await tx.rider.update({

          where: {

            id: assignment.riderId,

          },

          data: {

            availability: RiderAvailability.OFFLINE,

          },

        });



        await tx.deliveryEvent.create({

          data: {

            deliveryId: assignment.deliveryId,

            type: DeliveryEventType.DELIVERED,

            metadata: {

              riderId: assignment.riderId,

              assignmentId,

            },

          },

        });



        return updatedDelivery;

      },

    );



    this.realtimeService.emitDeliveryDelivered(
      assignment.deliveryId,
      DeliveryStatus.DELIVERED,
      {
        riderId: assignment.riderId,
        assignmentId,
        orderStatus: OrderStatus.DELIVERED,
      },
    );



    return delivery;

  }



  async failDelivery(

    assignmentId: string,

    reason?: string,

  ) {

    const assignment =

      await this.prisma.deliveryAssignment.findUnique({

        where: {

          id: assignmentId,

        },

        include: {

          delivery: true,

          rider: true,

        },

      });



    if (!assignment) {

      throw new NotFoundException(

        'Delivery assignment not found',

      );

    }



    if (

      assignment.status !==

      DeliveryAssignmentStatus.ACCEPTED

    ) {

      throw new ConflictException(

        'Only accepted assignments can fail delivery',

      );

    }



    if (

      assignment.delivery.status !==

      DeliveryStatus.OUT_FOR_DELIVERY

    ) {

      throw new ConflictException(

        'Delivery is not out for delivery',

      );

    }



    if (

      assignment.rider.availability !==

      RiderAvailability.ON_DELIVERY

    ) {

      throw new ConflictException(

        'Rider must be on delivery before failing delivery',

      );

    }



    const failedAt = new Date();



    const delivery = await this.prisma.$transaction(

      async (tx) => {

        const updatedDelivery =

          await tx.delivery.update({

            where: {

              id: assignment.deliveryId,

            },

            data: {

              status: DeliveryStatus.FAILED,

              failureReason: reason ?? null,

              failedAt,

            },

          });



        await tx.order.update({

          where: {

            id: assignment.delivery.orderId,

          },

          data: {

            status: OrderStatus.CANCELLED,

          },

        });



        await tx.rider.update({

          where: {

            id: assignment.riderId,

          },

          data: {

            availability: RiderAvailability.OFFLINE,

          },

        });



        await tx.deliveryEvent.create({

          data: {

            deliveryId: assignment.deliveryId,

            type: DeliveryEventType.FAILED,

            metadata: {

              riderId: assignment.riderId,

              assignmentId,

              reason: reason ?? null,

            },

          },

        });



        return updatedDelivery;

      },

    );



    this.realtimeService.emitDeliveryFailed(
      assignment.deliveryId,
      DeliveryStatus.FAILED,
      {
        riderId: assignment.riderId,
        assignmentId,
        reason: reason ?? null,
        orderStatus: OrderStatus.CANCELLED,
      },
    );



    return delivery;

  }



  async cancelDelivery(

    assignmentId: string,

    reason?: string,

  ) {

    const assignment =

      await this.prisma.deliveryAssignment.findUnique({

        where: {

          id: assignmentId,

        },

        include: {

          delivery: true,

          rider: true,

        },

      });



    if (!assignment) {

      throw new NotFoundException(

        'Delivery assignment not found',

      );

    }



    if (

      assignment.status !==

      DeliveryAssignmentStatus.ACCEPTED

    ) {

      throw new ConflictException(

        'Only accepted assignments can cancel delivery',

      );

    }



    if (

      assignment.delivery.status ===

        DeliveryStatus.DELIVERED ||

      assignment.delivery.status ===

        DeliveryStatus.FAILED ||

      assignment.delivery.status ===

        DeliveryStatus.CANCELLED

    ) {

      throw new ConflictException(

        'Delivery cannot be cancelled in its current state',

      );

    }



    const cancelledAt = new Date();



    const delivery = await this.prisma.$transaction(

      async (tx) => {

        const updatedDelivery =

          await tx.delivery.update({

            where: {

              id: assignment.deliveryId,

            },

            data: {

              status: DeliveryStatus.CANCELLED,

              cancellationReason: reason ?? null,

              cancelledAt,

            },

          });



        await tx.order.update({

          where: {

            id: assignment.delivery.orderId,

          },

          data: {

            status: OrderStatus.CANCELLED,

          },

        });



        await tx.rider.update({

          where: {

            id: assignment.riderId,

          },

          data: {

            availability: RiderAvailability.OFFLINE,

          },

        });



        await tx.deliveryEvent.create({

          data: {

            deliveryId: assignment.deliveryId,

            type: DeliveryEventType.CANCELLED,

            metadata: {

              riderId: assignment.riderId,

              assignmentId,

              reason: reason ?? null,

            },

          },

        });



        return updatedDelivery;

      },

    );



    this.realtimeService.emitDeliveryCancelled(
      assignment.deliveryId,
      DeliveryStatus.CANCELLED,
      {
        riderId: assignment.riderId,
        assignmentId,
        reason: reason ?? null,
        orderStatus: OrderStatus.CANCELLED,
      },
    );



    return delivery;

  }

}