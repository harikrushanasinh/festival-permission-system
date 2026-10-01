import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditLogQueryDto } from './dto/audit-log-query.dto.js';

export interface WriteAuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Append-only (B24) - never updated or deleted, including by this module itself.
   * Logging must never break the request it is observing: callers (the interceptor)
   * swallow any error this throws rather than surfacing it to the client.
   */
  async write(input: WriteAuditLogInput): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.userId,
        input.action,
        input.entityType,
        input.entityId,
        input.ipAddress ?? null,
        input.oldValue !== undefined ? JSON.stringify(input.oldValue) : null,
        input.newValue !== undefined ? JSON.stringify(input.newValue) : null,
      ],
    );
  }

  async query(filters: AuditLogQueryDto) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.entityType) {
      params.push(filters.entityType);
      conditions.push(`al.entity_type = $${params.length}`);
    }
    if (filters.entityId) {
      params.push(filters.entityId);
      conditions.push(`al.entity_id = $${params.length}`);
    }
    if (filters.userId) {
      params.push(filters.userId);
      conditions.push(`al.user_id = $${params.length}`);
    }
    if (filters.action) {
      params.push(filters.action);
      conditions.push(`al.action = $${params.length}`);
    }
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`al.created_at >= $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`al.created_at <= $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT al.id, al.user_id AS "userId", u.name AS "userName", al.action,
                al.entity_type AS "entityType", al.entity_id AS "entityId",
                al.ip_address AS "ipAddress", al.old_value AS "oldValue", al.new_value AS "newValue",
                al.created_at AS "createdAt"
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset],
      ),
      this.dataSource.query(`SELECT count(*)::int AS count FROM audit_logs al ${whereClause}`, params),
    ]);

    return { data: rows, total: countRows[0].count, page, pageSize };
  }

  async findOne(id: number) {
    const rows = await this.dataSource.query(
      `SELECT al.id, al.user_id AS "userId", u.name AS "userName", al.action,
              al.entity_type AS "entityType", al.entity_id AS "entityId",
              al.ip_address AS "ipAddress", al.old_value AS "oldValue", al.new_value AS "newValue",
              al.created_at AS "createdAt"
       FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id WHERE al.id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Audit log entry not found');
    return rows[0];
  }
}
