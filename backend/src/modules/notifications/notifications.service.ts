import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface CreateNotificationInput {
  userId: string;
  eventCode: string;
  title: string;
  body?: string;
  relatedApplicationId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * In-app record only for now (channel = IN_APP). Push/email/SMS delivery
   * per-channel is Module 24's job - this just guarantees every alert this
   * module or a future one raises has a durable, queryable record.
   */
  async create(input: CreateNotificationInput): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO notifications (user_id, event_code, title, body, channel, related_application_id)
       VALUES ($1, $2, $3, $4, 'IN_APP', $5)`,
      [input.userId, input.eventCode, input.title, input.body ?? null, input.relatedApplicationId ?? null],
    );
  }

  async createForUsers(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>): Promise<void> {
    await Promise.all(userIds.map((userId) => this.create({ ...input, userId })));
  }

  async listForUser(userId: string) {
    return this.dataSource.query(
      `SELECT id, event_code AS "eventCode", title, body, related_application_id AS "relatedApplicationId",
              is_read AS "isRead", created_at AS "createdAt"
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId],
    );
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    const result = await this.dataSource.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId],
    );
    return result[0].length > 0;
  }
}
