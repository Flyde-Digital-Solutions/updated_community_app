import { normalizeTicket, ticketApiStatus } from '../src/context/AppContext';

describe('ticket API normalization', () => {
  it('keeps the display ID and database ID and reads the nested category contract', () => {
    const ticket = normalizeTicket({
      _id: '6aa14c58cd73d1f94e9876af',
      ticketId: 'TKT-2609-0007',
      subject: 'Projector issue',
      description: 'No signal',
      status: 'open',
      priority: 'medium',
      category: {
        categoryId: { _id: '6a425113433d229dc19e7092', name: 'Meeting Rooms' },
        subCategory: { _id: 'subcategory-id', name: 'AV Equipment' },
      },
      createdBy: '69f5ab1c9e51117f5c56a29e',
    });

    expect(ticket).toMatchObject({
      id: 'TKT-2609-0007',
      backendId: '6aa14c58cd73d1f94e9876af',
      category: 'Meeting Rooms',
      categoryId: '6a425113433d229dc19e7092',
      subCategory: 'subcategory-id',
      memberName: '',
    });
  });

  it('keeps a populated creator name instead of exposing raw identifiers', () => {
    const ticket = normalizeTicket({
      _id: 'database-id',
      subject: 'Network issue',
      description: 'Offline',
      createdBy: { _id: 'creator-id', firstName: 'Asha', lastName: 'Rao' },
    });

    expect(ticket.memberName).toBe('Asha Rao');
  });

  it('supports snake-case creator fields returned by older ticket responses', () => {
    const ticket = normalizeTicket({
      _id: 'database-id',
      subject: 'Access issue',
      created_by: '69f5ab1c9e51117f5c56a29e',
      created_by_name: 'Nasir Ansari',
    });

    expect(ticket.createdById).toBe('69f5ab1c9e51117f5c56a29e');
    expect(ticket.memberName).toBe('Nasir Ansari');
  });

  it('uses the ticket service status value and shows it correctly', () => {
    expect(ticketApiStatus('In Progress')).toBe('inprogress');
    expect(normalizeTicket({ status: 'inprogress' }).status).toBe('In Progress');
  });
});
