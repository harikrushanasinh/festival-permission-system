import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApplicationStatus } from './application-status.enum.js';

@Entity('application_status_history')
export class ApplicationStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  applicationId!: string;

  @Column({ type: 'enum', enum: ApplicationStatus, enumName: 'application_status', nullable: true })
  fromStatus?: ApplicationStatus;

  @Column({ type: 'enum', enum: ApplicationStatus, enumName: 'application_status' })
  toStatus!: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ nullable: true })
  changedBy?: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt!: Date;
}
