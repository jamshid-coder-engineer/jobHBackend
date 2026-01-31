import { FindManyOptions } from 'typeorm';

export interface ISuccess {
  statusCode: number;
  message: {
    uz: string;
    en: string;
    ru: string;
  };
  data: any;
}

export interface IResponsePagination extends ISuccess {
  totalElements: number;
  totalPages: number;
  pageSize: number;
  currentPage: number;
  from: number;
  to: number;
}

export interface IFindOptions<T> extends FindManyOptions<T> {}
