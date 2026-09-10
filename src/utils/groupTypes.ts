export interface GroupTypeMeta {
  id: string;
  label: string;
  description: string;
  suggestedCategories: string[];
}

export const GROUP_TYPES: Record<string, GroupTypeMeta> = {
  shared_living: {
    id: 'shared_living',
    label: 'Shared Living',
    description: 'Roommates, shared apartments, family homes',
    suggestedCategories: ['bills', 'food', 'shopping'],
  },
  trip: {
    id: 'trip',
    label: 'Trip',
    description: 'Vacations, weekend getaways, road trips',
    suggestedCategories: ['food', 'transport', 'shopping'],
  },
  day_to_day: {
    id: 'day_to_day',
    label: 'Day-to-Day',
    description: 'Regular friend groups, office lunches',
    suggestedCategories: ['food', 'shopping', 'transport', 'other'],
  },
  event: {
    id: 'event',
    label: 'Event',
    description: 'Weddings, parties, concerts, festivals',
    suggestedCategories: ['food', 'shopping', 'other'],
  },
  reimbursable: {
    id: 'reimbursable',
    label: 'Reimbursable',
    description: 'Work trips, team lunches, shared expenses',
    suggestedCategories: ['food', 'transport', 'other'],
  },
};

export function getGroupTypeMeta(type?: string | null): GroupTypeMeta {
  if (!type) return GROUP_TYPES.day_to_day;
  return GROUP_TYPES[type] || GROUP_TYPES.day_to_day;
}
