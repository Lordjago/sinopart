export interface NotificationField {
  label: string;
  value?: string;
}

export interface NotificationAction {
  label: string;
  url: string;
}

export interface Notification {
  title: string;
  fields: NotificationField[];
  action?: NotificationAction;
  at?: Date;
}

export interface NotificationService {
  notify(notification: Notification): Promise<void>;
}
