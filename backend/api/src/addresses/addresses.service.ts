import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAddressDto } from './dto/create-address.dto';
import type { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyAddresses(customerId: string) {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getMyAddress(customerId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async createAddress(
    customerId: string,
    data: CreateAddressDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          customerId,
          label: data.label,
          line1: data.line1,
          line2: data.line2,
          area: data.area,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          latitude: data.latitude,
          longitude: data.longitude,
          contactName: data.contactName,
          contactPhone: data.contactPhone,
          isDefault: data.isDefault ?? false,
          deliveryInstructions: data.deliveryInstructions,
        },
      });
    });
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    data: UpdateAddressDto,
  ) {
    const existing = await this.getMyAddress(customerId, addressId);

    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        await tx.customerAddress.updateMany({
          where: {
            customerId,
            id: { not: addressId },
          },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.update({
        where: { id: existing.id },
        data: {
          ...(data.label !== undefined && { label: data.label }),
          ...(data.line1 !== undefined && { line1: data.line1 }),
          ...(data.line2 !== undefined && { line2: data.line2 }),
          ...(data.area !== undefined && { area: data.area }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.state !== undefined && { state: data.state }),
          ...(data.pincode !== undefined && { pincode: data.pincode }),
          ...(data.latitude !== undefined && {
            latitude: data.latitude,
          }),
          ...(data.longitude !== undefined && {
            longitude: data.longitude,
          }),
          ...(data.contactName !== undefined && {
            contactName: data.contactName,
          }),
          ...(data.contactPhone !== undefined && {
            contactPhone: data.contactPhone,
          }),
          ...(data.isDefault !== undefined && {
            isDefault: data.isDefault,
          }),
          ...(data.deliveryInstructions !== undefined && {
            deliveryInstructions: data.deliveryInstructions,
          }),
        },
      });
    });
  }

  async deleteAddress(customerId: string, addressId: string) {
    const existing = await this.getMyAddress(customerId, addressId);

    await this.prisma.customerAddress.delete({
      where: { id: existing.id },
    });

    return {
      message: 'Address deleted successfully',
    };
  }
}