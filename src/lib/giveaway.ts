// Coral Springs Village $50,000 JMD giveaway configuration
export const GIVEAWAY = {
  prize: 'JMD $50,000',
  startDate: new Date('2026-09-01T00:00:00-05:00'),
  endDate: new Date('2026-09-30T23:59:59-05:00'),
  drawDate: new Date('2026-10-01T00:00:00-05:00'),
  community: 'Coral Springs Village',
  // Banner stops showing after the draw date
  hideAfter: new Date('2026-10-02T00:00:00-05:00'),
};

export const isGiveawayVisible = (now: Date = new Date()) => now < GIVEAWAY.hideAfter;

export const isGiveawayLive = (now: Date = new Date()) =>
  now >= GIVEAWAY.startDate && now <= GIVEAWAY.endDate;
