import { IsArray } from 'class-validator';
import { PageMetaDto } from './page-meta.dto';

export class ResponsePaginate<T> {
  @IsArray()
  readonly result: T[];

  readonly meta: PageMetaDto;

  constructor(data: T[], meta: PageMetaDto) {
    this.result = data;
    this.meta = meta;
  }
}
