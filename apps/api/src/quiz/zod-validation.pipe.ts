import { BadRequestException, type ArgumentMetadata, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export class ZodValidationPipe<Schema extends z.ZodTypeAny> implements PipeTransform<unknown, z.infer<Schema>> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): z.infer<Schema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({ message: 'Request validation failed', issues: result.error.issues });
    }
    return result.data;
  }
}