import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// The `boundary` geography(Polygon) column is intentionally NOT mapped here —
// TypeORM's plain column types don't round-trip PostGIS geometry cleanly, so
// AreasService reads/writes it via raw SQL (ST_GeomFromText / ST_AsGeoJSON).
// This entity only carries the scalar fields.
@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ name: 'police_station_id' })
  policeStationId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
