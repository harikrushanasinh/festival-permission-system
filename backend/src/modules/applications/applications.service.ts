import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Application } from './application.entity.js';
import { ApplicationStatusHistory } from './application-status-history.entity.js';
import { ApplicationStatus, EDITABLE_STATUSES } from './application-status.enum.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';
import { QueryApplicationDto } from './dto/query-application.dto.js';
import { Festival } from '../festivals/festival.entity.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

export interface RequestingUser {
  sub: string;
  role: UserRole;
}

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.POLICE_ADMIN, UserRole.POLICE_OFFICER];

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application) private readonly repo: Repository<Application>,
    @InjectRepository(ApplicationStatusHistory) private readonly historyRepo: Repository<ApplicationStatusHistory>,
    @InjectRepository(Festival) private readonly festivalRepo: Repository<Festival>,
    private readonly dataSource: DataSource,
  ) {}

  private assertTimeOrder(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
  }

  async create(organizerId: string, dto: CreateApplicationDto): Promise<Application> {
    this.assertTimeOrder(dto.startTime, dto.endTime);

    const application = this.repo.create({
      ...dto,
      organizerId,
      status: ApplicationStatus.DRAFT,
    });
    const saved = await this.repo.save(application);

    await this.historyRepo.save(
      this.historyRepo.create({ applicationId: saved.id, toStatus: ApplicationStatus.DRAFT, changedBy: organizerId }),
    );
    return saved;
  }

  async findAll(user: RequestingUser, query: QueryApplicationDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'eventDate';

    const qb = this.repo.createQueryBuilder('application');

    if (!STAFF_ROLES.includes(user.role)) {
      qb.andWhere('application.organizerId = :organizerId', { organizerId: user.sub });
    }
    if (query.festivalId) qb.andWhere('application.festivalId = :festivalId', { festivalId: query.festivalId });
    if (query.eventTypeId) qb.andWhere('application.eventTypeId = :eventTypeId', { eventTypeId: query.eventTypeId });
    if (query.status) qb.andWhere('application.status = :status', { status: query.status });

    qb.orderBy(`application.${sortBy}`, 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findOne(id: string, user: RequestingUser): Promise<Application> {
    const application = await this.repo.findOneBy({ id });
    if (!application) throw new NotFoundException('Application not found');

    if (!STAFF_ROLES.includes(user.role) && application.organizerId !== user.sub) {
      throw new ForbiddenException('You do not have access to this application');
    }
    return application;
  }

  async update(id: string, user: RequestingUser, dto: UpdateApplicationDto): Promise<Application> {
    const application = await this.findOne(id, user);

    if (application.organizerId !== user.sub) {
      throw new ForbiddenException('Only the owning organizer can edit this application');
    }
    if (!EDITABLE_STATUSES.includes(application.status)) {
      throw new BadRequestException(`Application cannot be edited while status is ${application.status}`);
    }

    const startTime = dto.startTime ?? application.startTime;
    const endTime = dto.endTime ?? application.endTime;
    this.assertTimeOrder(startTime, endTime);

    Object.assign(application, dto);
    return this.repo.save(application);
  }

  async remove(id: string, user: RequestingUser): Promise<void> {
    const application = await this.findOne(id, user);
    if (application.organizerId !== user.sub) {
      throw new ForbiddenException('Only the owning organizer can delete this application');
    }
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT applications can be deleted');
    }
    await this.repo.remove(application);
  }

  /** F13/B08 - assigns application_no (e.g. GAN-2026-00001) and moves to SUBMITTED/RESUBMITTED. */
  async submit(id: string, user: RequestingUser): Promise<Application> {
    const application = await this.findOne(id, user);
    if (application.organizerId !== user.sub) {
      throw new ForbiddenException('Only the owning organizer can submit this application');
    }
    if (!EDITABLE_STATUSES.includes(application.status)) {
      throw new BadRequestException(`Application cannot be submitted while status is ${application.status}`);
    }

    const fromStatus = application.status;
    const toStatus = fromStatus === ApplicationStatus.CHANGES_REQUESTED
      ? ApplicationStatus.RESUBMITTED
      : ApplicationStatus.SUBMITTED;

    return this.dataSource.transaction(async (manager) => {
      // Assign the application number once, on first submission. A
      // CHANGES_REQUESTED -> RESUBMITTED cycle is still the same application
      // and must keep it.
      if (!application.applicationNo) {
        const festival = await manager.findOneByOrFail(Festival, { id: application.festivalId });

        // Advisory lock scoped to festival+year avoids two concurrent submits
        // racing on the same sequence number.
        const year = new Date(application.eventDate).getFullYear();
        const lockKey = `${festival.code}-${year}`;
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);

        const { count } = await manager
          .createQueryBuilder(Application, 'a')
          .where('a.applicationNo LIKE :prefix', { prefix: `${festival.code}-${year}-%` })
          .select('COUNT(*)', 'count')
          .getRawOne<{ count: string }>() as { count: string };

        const sequence = parseInt(count, 10) + 1;
        application.applicationNo = `${festival.code}-${year}-${String(sequence).padStart(5, '0')}`;
      }

      application.status = toStatus;

      const saved = await manager.save(application);
      await manager.save(
        this.historyRepo.create({ applicationId: id, fromStatus, toStatus, changedBy: user.sub }),
      );
      return saved;
    });
  }
}
