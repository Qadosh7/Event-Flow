export interface AgendaItem {
  id: string;
  title: string;
  presenter?: string;
  duration: number; // in minutes
  type: 'presentation' | 'break' | 'lunch';
  order: number;
  isCompleted: boolean;
  eventId: string;
}

export interface Event {
  id: string;
  name: string;
  date?: string;
  ownerId: string;
  createdAt: any;
}
