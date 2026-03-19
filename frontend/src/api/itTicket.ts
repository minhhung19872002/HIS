import client from './client';

export const getItTickets = (params?: any) => client.get('/system/it-tickets', { params });
export const createItTicket = (data: any) => client.post('/system/it-tickets', data);
export const respondToTicket = (id: string, data: any) => client.put(`/system/it-tickets/${id}/respond`, data);
export const closeTicket = (id: string) => client.put(`/system/it-tickets/${id}/close`);
export const getItTicketStats = () => client.get('/system/it-tickets/stats');
