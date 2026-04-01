import client from './client';

type ItTicketQueryParams = Record<string, string | number | boolean | null | undefined>;
type ItTicketPayload = Record<string, unknown>;

export const getItTickets = (params?: ItTicketQueryParams) => client.get('/system/it-tickets', { params });
export const createItTicket = (data: ItTicketPayload) => client.post('/system/it-tickets', data);
export const respondToTicket = (id: string, data: ItTicketPayload) => client.put(`/system/it-tickets/${id}/respond`, data);
export const closeTicket = (id: string) => client.put(`/system/it-tickets/${id}/close`);
export const getItTicketStats = () => client.get('/system/it-tickets/stats');
