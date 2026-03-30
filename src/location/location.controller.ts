import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Public } from '../common/decorators/public.decorator';
import {
  GetZonesDocs,
  LocationApiTags,
  UpdateLocationDocs,
} from '../docs/swagger/location.swagger';
import type { RequestWithUser } from 'types/auth';

@LocationApiTags
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Public()
  @Get('zones')
  @GetZonesDocs()
  @HttpCode(HttpStatus.OK)
  async getZones() {
    const zones = await this.locationService.findAllZones();
    return { zones };
  }

  @Patch('profile')
  @UpdateLocationDocs()
  @HttpCode(HttpStatus.OK)
  async updateLocation(
    @Req() req: RequestWithUser,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationService.updateLocation(req.user.id, updateLocationDto);
  }
}
