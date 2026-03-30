import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllZones() {
    return this.prisma.zone.findMany({
      where: { isActive: true },
      include: {
        areas: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateLocation(userId: string, updateLocationDto: UpdateLocationDto) {
    const { zoneId, areaId } = updateLocationDto;

    // Verify zone and area exist
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
    });
    if (!zone) {
      throw new NotFoundException(`Zone with ID ${zoneId} not found`);
    }

    const area = await this.prisma.area.findUnique({
      where: { id: areaId },
    });
    if (!area || area.zoneId !== zoneId) {
      throw new NotFoundException(
        `Area with ID ${areaId} not found in zone ${zoneId}`,
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        selectedZoneId: zoneId,
        selectedAreaId: areaId,
        isProfileComplete: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isProfileComplete: true,
        selectedZoneId: true,
        selectedAreaId: true,
      },
    });
  }
}
