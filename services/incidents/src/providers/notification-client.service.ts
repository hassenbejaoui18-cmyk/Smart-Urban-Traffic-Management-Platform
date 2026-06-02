import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncidentType } from '../entities/incident-type.enum';
import { IncidentStatus } from '../entities/incident-status.enum';

/**
 * Service: NotificationClientService
 * -----------------------------------
 * HTTP GraphQL client that calls the Notification service's
 * createNotification mutation. Fires notifications when an
 * incident is created or its status changes, following the
 * same pattern as Traffic's VehicleClientService.
 */
@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly notificationServiceUrl: string;

  constructor(config: ConfigService) {
    this.notificationServiceUrl =
      config.get<string>('NOTIFICATION_SERVICE_URL') ??
      'http://localhost:4005/graphql';
  }

  async notifyIncidentCreated(
    userId: string,
    incidentId: string,
    type: IncidentType,
    description: string,
    token?: string,
  ) {
    const title = `Incident Reported: ${type}`;
    const message = `A ${type.toLowerCase().replace(/_/g, ' ')} incident has been reported: ${description}`;
    await this.sendNotification(userId, title, message, 'INCIDENT', incidentId, token);
  }

  async notifyIncidentStatusChanged(
    userId: string,
    incidentId: string,
    status: IncidentStatus,
    token?: string,
  ) {
    const title = 'Incident Status Updated';
    const message = `Incident status has changed to ${status}.`;
    await this.sendNotification(userId, title, message, 'INCIDENT', incidentId, token);
  }

  private async sendNotification(
    userId: string,
    title: string,
    message: string,
    triggerType: string,
    triggerId: string,
    token?: string,
  ) {
    try {
      const query = `
        mutation ($input: CreateNotificationInput!) {
          createNotification(input: $input) { id }
        }
      `;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = token;
      await fetch(this.notificationServiceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables: {
            input: { userId, title, message, triggerType, triggerId },
          },
        }),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send notification for incident ${triggerId}`,
        error,
      );
    }
  }
}
