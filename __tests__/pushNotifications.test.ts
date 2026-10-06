import {
  isPushDeliveryTerminal,
  parseCommunityPushIntent,
  pushDeliveryStatusFrom,
} from '../src/utils/pushNotifications';

describe('community push contract', () => {
  it.each([
    ['community_access_safety', 'community_access_issue'],
    ['community_visitor_processing', 'community_visitor_details'],
    ['community_building_incident', 'building_incident_details'],
    ['community_task_sla', 'community_task_details'],
  ])('accepts %s only with its documented route', (eventType, routeKey) => {
    expect(parseCommunityPushIntent({
      notificationId: '64f000000000000000000001',
      eventType,
      routeKey,
      entityId: '64f000000000000000000002',
    })).toEqual({
      notificationId: '64f000000000000000000001',
      eventType,
      routeKey,
      entityId: '64f000000000000000000002',
    });
  });

  it('rejects mismatched routes, missing fields, and URL-like entity IDs', () => {
    expect(parseCommunityPushIntent({
      notificationId: '64f000000000000000000001',
      eventType: 'community_access_safety',
      routeKey: 'building_incident_details',
      entityId: '64f000000000000000000002',
    })).toBeNull();
    expect(parseCommunityPushIntent({ eventType: 'community_access_safety' })).toBeNull();
    expect(parseCommunityPushIntent({
      notificationId: '64f000000000000000000001',
      eventType: 'community_access_safety',
      routeKey: 'community_access_issue',
      entityId: 'https://example.com/private',
    })).toBeNull();
  });

  it('labels queued delivery as non-terminal until processing completes', () => {
    const queued = pushDeliveryStatusFrom({ total: 2, queued: 2 });
    const complete = pushDeliveryStatusFrom({ total: 2, sent: 1, failed: 1 });
    expect(isPushDeliveryTerminal(queued)).toBe(false);
    expect(isPushDeliveryTerminal(complete)).toBe(true);
  });
});
