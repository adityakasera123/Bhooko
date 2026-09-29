export class RealtimeEventDto {
  event!: string;

  timestamp!: string;

  status?: string;

  data?: Record<string, unknown>;
}
