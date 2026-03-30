import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

export const LocationApiTags = ApiTags('Locations');

export function GetZonesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all active zones and areas',
      description:
        'Fetches a list of all available delivery zones and their associated areas.',
    }),
    ApiResponse({
      status: 200,
      description: 'Object containing list of zones retrieved successfully.',
    }),
  );
}

export function UpdateLocationDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update user selected location',
      description:
        "Updates the user's selected zone and area, and marks the profile as complete.",
    }),
    ApiResponse({
      status: 200,
      description: 'User profile updated successfully.',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized.',
    }),
    ApiResponse({
      status: 404,
      description: 'Zone or Area not found.',
    }),
  );
}
