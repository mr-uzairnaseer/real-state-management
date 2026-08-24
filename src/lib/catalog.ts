export const UNIT_TYPES = [
  { value: 'shop', label: 'Shop' },
  { value: 'office', label: 'Office' },
  { value: 'hall', label: 'Hall' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'parking', label: 'Parking' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'entrance', label: 'Main Entrance' },
  { value: 'boulevard', label: 'Main Boulevard' },
  { value: 'staircase', label: 'Staircase' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'facade', label: 'Exterior / Façade' },
  { value: 'common_area', label: 'Common Area' },
  { value: 'plot', label: 'Plot' },
  { value: 'other', label: 'Other' },
] as const;

export const COMMON_AREA_TYPES = [
  'parking',
  'rooftop',
  'entrance',
  'boulevard',
  'staircase',
  'elevator',
  'facade',
  'common_area',
  'hall',
] as const;

export function isCommonAreaType(type: string) {
  return (COMMON_AREA_TYPES as readonly string[]).includes(type);
}

export const UNIT_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'booked', label: 'Booked' },
  { value: 'sold', label: 'Sold' },
  { value: 'rented', label: 'Rented' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'completed', label: 'Completed' },
  { value: 'sold_land_only', label: 'Sold — Land Only' },
] as const;

export const EXPENSE_CATEGORIES = [
  'Cement',
  'Steel',
  'Bricks',
  'Sand',
  'Labour',
  'Electrical',
  'Plumbing',
  'Paint',
  'Flooring',
  'Tiles',
  'Wood',
  'Glass',
  'Hardware',
  'Machinery',
  'Transportation',
  'Parking',
  'Decoration',
  'Grey Structure',
  'Food / Refreshments',
  'Site Maintenance',
  'Utilities',
  'Miscellaneous',
  'Administrative',
  'Other Expenses',
] as const;

export const DAILY_EXPENSE_CATEGORIES = [
  'Food / Refreshments',
  'Transportation',
  'Labour',
  'Site Maintenance',
  'Utilities',
  'Miscellaneous',
  'Other Expenses',
] as const;

export const PURCHASE_ITEMS = [
  'Cement',
  'Steel',
  'Bricks',
  'Sand',
  'Electrical equipment',
  'Plumbing material',
  'Tiles',
  'Paint',
  'Wood',
  'Glass',
  'Hardware',
  'Other construction materials',
] as const;

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
] as const;

export const EXPENSE_SCOPES = [
  { value: 'unit', label: 'Unit-specific' },
  { value: 'common', label: 'Common construction' },
  { value: 'admin', label: 'Administrative' },
  { value: 'daily', label: 'Daily site expense' },
  { value: 'purchase', label: 'Material purchase' },
] as const;

export const LABOUR_CATEGORIES = [
  'General labour',
  'Mason',
  'Electrician',
  'Plumber',
  'Painter',
  'Carpenter',
  'Steel fixer',
  'Contractor crew',
  'Other',
] as const;
