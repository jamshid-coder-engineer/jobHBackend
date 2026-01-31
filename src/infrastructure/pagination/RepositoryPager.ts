import { FindManyOptions, ObjectLiteral, Repository } from 'typeorm';
import { Pager } from './Pager';
import { IFindOptions, IResponsePagination } from './successResponse';

export class RepositoryPager {
  public static readonly DEFAULT_PAGE = 1;
  public static readonly DEFAULT_PAGE_SIZE = 10;

  public static async findAll<T extends ObjectLiteral>(
    repository: Repository<T>,
    options?: IFindOptions<T>,
  ): Promise<IResponsePagination> {
    const page = options?.skip ?? this.DEFAULT_PAGE; // bu yerda skip = page
    const pageSize = options?.take ?? this.DEFAULT_PAGE_SIZE;

    const [data, count] = await repository.findAndCount(
      RepositoryPager.normalizePagination(options),
    );

    return Pager.of(
      200,
      {
        uz: 'Amaliyot muvaffaqiyatli bajarildi',
        en: 'Operation successfully completed',
        ru: 'Операция успешно выполнена',
      },
      data,
      count,
      pageSize,
      page, // <-- currentPage shu bo‘lishi kerak
    );
  }

  private static normalizePagination<T>(
    options?: IFindOptions<T>,
  ): FindManyOptions<T> {
    const page = (options?.skip ?? this.DEFAULT_PAGE) - 1; // page -> zero-based
    const take = options?.take ?? this.DEFAULT_PAGE_SIZE;

    return {
      ...options,
      take,
      skip: page * take, // offset
    };
  }
}
