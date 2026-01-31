import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { DeepPartial, Repository } from 'typeorm';
import {
  IFindOptions,
  IResponsePagination,
  ISuccess,
} from '../pagination/successResponse';
import { RepositoryPager } from '../pagination/RepositoryPager';
import { successRes } from '../response/success.response';

// Bazaviy entitylarda bo‘lishi mumkin bo‘lgan fieldlar (optional)
type SoftDeletable = { isDeleted?: boolean };
type Activatable = { isActive?: boolean };

export class BaseService<CreateDto, UpdateDto, Entity extends object> {
  constructor(private readonly repository: Repository<Entity>) {}

  get getRepository() {
    return this.repository;
  }

  async create(dto: CreateDto): Promise<ISuccess> {
    let data = this.repository.create(dto as DeepPartial<Entity>);
    data = await this.repository.save(data);
    return successRes(data, 201);
  }

  async findAll(options?: IFindOptions<Entity>): Promise<ISuccess> {
    const data = await this.repository.find({
      ...(options || {}),
    } as any);
    return successRes(data);
  }

  async findAllWithPagination(
    options?: IFindOptions<Entity>,
  ): Promise<IResponsePagination> {
    return RepositoryPager.findAll(this.getRepository as any, options);
  }

  async findOneBy(options: IFindOptions<Entity>): Promise<ISuccess> {
    const data = await this.repository.findOne({
      select: options.select || ({} as any),
      relations: options.relations || [],
      where: options.where as any,
    } as any);

    if (!data) throw new NotFoundException('Entity not found');

    return successRes(data);
  }

  async findOneById(
    id: string,
    options?: IFindOptions<Entity>,
  ): Promise<ISuccess> {
    const data = await this.repository.findOne({
      select: options?.select || ({} as any),
      relations: options?.relations || [],
      where: { id, ...(options?.where as any) } as any,
    } as any);

    if (!data) throw new NotFoundException('Entity not found');

    return successRes(data);
  }

  async update(id: string, dto: UpdateDto): Promise<ISuccess> {
    await this.findOneById(id);
    await this.repository.update(id as any, dto as any);

    const data = await this.repository.findOne({ where: { id } as any } as any);
    return successRes(data);
  }

  async delete(id: string): Promise<ISuccess> {
    await this.findOneById(id);
    await this.repository.delete(id as any);
    return successRes({});
  }

  /**
   * softDelete ishlashi uchun Entity’da `isDeleted: boolean` field bo‘lishi kerak.
   * Bu field BaseEntity’da bo‘lsa ideal.
   */
  async softDelete(id: string): Promise<ISuccess> {
    const entity = (await this.repository.findOne({
      where: { id } as any,
    } as any)) as Entity & SoftDeletable;

    if (!entity) throw new NotFoundException('Entity not found');

    if (typeof entity.isDeleted !== 'boolean') {
      throw new HttpException(
        'This entity does not support softDelete (missing isDeleted:boolean)',
        HttpStatus.BAD_REQUEST,
      );
    }

    entity.isDeleted = true;
    const data = await this.repository.save(entity as any);

    return successRes({ isDeleted: (data as any).isDeleted });
  }

  /**
   * updateStatus ishlashi uchun Entity’da `isActive: boolean` field bo‘lishi kerak.
   */
  async updateStatus(id: string): Promise<ISuccess> {
    const entity = (await this.repository.findOne({
      where: { id } as any,
    } as any)) as Entity & Activatable;

    if (!entity) throw new NotFoundException('Entity not found');

    if (typeof entity.isActive !== 'boolean') {
      throw new HttpException(
        'This entity does not support updateStatus (missing isActive:boolean)',
        HttpStatus.BAD_REQUEST,
      );
    }

    entity.isActive = !entity.isActive;
    const data = await this.repository.save(entity as any);

    return successRes({ isActive: (data as any).isActive });
  }
}
