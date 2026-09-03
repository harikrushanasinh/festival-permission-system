import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ApplicationStatus } from './application-status.enum.js';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true, unique: true })
  applicationNo?: string;

  @Column()
  organizerId!: string;

  @Column()
  festivalId!: string;

  @Column()
  eventTypeId!: string;

  @Column()
  mandalName!: string;

  @Column()
  eventName!: string;

  @Column({ type: 'date' })
  eventDate!: string;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column()
  expectedCrowd!: number;

  @Column({ default: 0 })
  vehicleCount!: number;

  @Column({ nullable: true })
  vehicleType?: string;

  @Column({ default: false })
  hasSoundSystem!: boolean;

  @Column({ default: false })
  hasDj!: boolean;

  @Column({ default: false })
  hasDhol!: boolean;

  @Column({ default: false })
  hasGenerator!: boolean;

  @Column({ type: 'text', nullable: true })
  specialRequirements?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ApplicationStatus, enumName: 'application_status', default: ApplicationStatus.DRAFT })
  status!: ApplicationStatus;

  @Column({ nullable: true })
  activeRouteId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
