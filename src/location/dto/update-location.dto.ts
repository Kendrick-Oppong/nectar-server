import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({
    example: 'cmnccvmtq0000pshjxc37iebb',
    description: 'The ID of the selected zone',
  })
  @IsString()
  @IsNotEmpty()
  zoneId!: string;

  @ApiProperty({
    example: 'cmnccvmtq0001pshjxc37iebb',
    description: 'The ID of the selected area',
  })
  @IsString()
  @IsNotEmpty()
  areaId!: string;
}
