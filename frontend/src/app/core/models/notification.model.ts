export interface AppNotification {
  id: string;
  eventCode: string;
  title: string;
  body?: string | null;
  relatedApplicationId?: string | null;
  isRead: boolean;
  createdAt: string;
}
