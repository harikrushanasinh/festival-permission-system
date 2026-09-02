import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('police_stations')
export class PoliceStation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'double precision' })
  latitude!: number;

  @Column({ type: 'double precision' })
  longitude!: number;

  // The `location` geography column is maintained by a DB trigger (see migration
  // 0015) from latitude/longitude — TypeORM never reads or writes it directly.

  @Column({ nullable: true })
  contact?: string;

  @Column({ default: 'ACTIVE' })
  status!: 'ACTIVE' | 'INACTIVE';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
