import {
  memberMatchesTicketCreator,
  normalizeMember,
  normalizeTicket,
  ticketApiStatus,
  toTicketPayload,
} from '../src/context/AppContext';

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
      building: { _id: 'building-id', name: '12th Floor' },
      createdBy: '69f5ab1c9e51117f5c56a29e',
    });

    expect(ticket).toMatchObject({
      id: 'TKT-2609-0007',
      backendId: '6aa14c58cd73d1f94e9876af',
      category: 'Meeting Rooms',
      categoryId: '6a425113433d229dc19e7092',
      subCategory: 'subcategory-id',
      buildingId: 'building-id',
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

  it('uses the guest reference returned for member-app tickets', () => {
    const unpopulated = normalizeTicket({
      _id: 'database-id',
      subject: 'Member app ticket',
      guest: '6abb6def5b03b9306c07a342',
    });
    const populated = normalizeTicket({
      _id: 'database-id-2',
      subject: 'Populated member app ticket',
      guest: {
        _id: '6abb6def5b03b9306c07a342',
        firstName: 'Ritik',
        lastName: 'Test',
      },
    });

    expect(unpopulated.createdById).toBe('6abb6def5b03b9306c07a342');
    expect(unpopulated.memberName).toBe('');
    expect(populated.createdById).toBe('6abb6def5b03b9306c07a342');
    expect(populated.memberName).toBe('Ritik Test');
  });

  it('reads a creator populated through a nested user record', () => {
    const ticket = normalizeTicket({
      _id: 'database-id',
      subject: 'Member-created ticket',
      createdBy: {
        _id: 'membership-id',
        user: {
          _id: 'user-id',
          firstName: 'Ritik',
          lastName: 'Test',
        },
      },
    });

    expect(ticket.createdById).toBe('membership-id');
    expect(ticket.memberName).toBe('Ritik Test');
  });

  it('matches a ticket auth-user ID to its community member record', () => {
    const member = normalizeMember({
      _id: 'membership-id',
      userId: {
        _id: 'user-id',
        firstName: 'Ritik',
        lastName: 'Test',
        email: 'ritik@example.com',
      },
    });

    expect(member).toMatchObject({
      id: 'membership-id',
      userId: 'user-id',
      name: 'Ritik Test',
      email: 'ritik@example.com',
    });
    expect(memberMatchesTicketCreator(member, 'membership-id')).toBe(true);
    expect(memberMatchesTicketCreator(member, 'user-id')).toBe(true);
  });

  it('uses the ticket service status value and shows it correctly', () => {
    expect(ticketApiStatus('In Progress')).toBe('inprogress');
    expect(normalizeTicket({ status: 'inprogress' }).status).toBe('In Progress');
  });

  it('keeps the latest public reply returned by the ticket API', () => {
    expect(normalizeTicket({ publicReply: 'Technician assigned.' }).publicReply)
      .toBe('Technician assigned.');
    expect(normalizeTicket({
      publicReplies: [
        { message: 'We are checking this.' },
        { message: 'The issue is resolved.' },
      ],
    }).publicReply).toBe('The issue is resolved.');
  });

  it('sends a trimmed nonempty public reply in ticket PATCH payloads', () => {
    expect(toTicketPayload({ publicReply: '  We are working on it.  ' }))
      .toEqual({ publicReply: 'We are working on it.' });
    expect(toTicketPayload({ publicReply: '   ' })).toEqual({});
  });
});
