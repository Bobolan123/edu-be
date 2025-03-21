import { IsArray } from 'class-validator';
import { PageMetaDto } from './page-meta.dto';

export class ResponsePaginate<T> {
    @IsArray()
    readonly data: T[];

    readonly meta: PageMetaDto;


    constructor(data: T[], meta: PageMetaDto) {
        this.data = data;
        this.meta = meta; 
    }
}