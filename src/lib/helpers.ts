import type { UnitStatus, TaskStatus, PaymentStatus } from '@/lib/types';

export function unitTone(
  status: UnitStatus,
): 'neutral' | 'blue' | 'green' | 'red' | 'orange' | 'yellow' | 'purple' {
  switch (status) {
    case 'sold':
    case 'sold_land_only':
      return 'green';
    case 'rented':
      return 'blue';
    case 'available':
      return 'neutral';
    case 'reserved':
      return 'yellow';
    case 'booked':
      return 'purple';
    case 'completed':
      return 'green';
    case 'under_construction':
      return 'orange';
    default:
      return 'neutral';
  }
}

export function taskTone(
  status: TaskStatus,
): 'neutral' | 'blue' | 'green' | 'red' | 'orange' | 'yellow' {
  switch (status) {
    case 'completed':
      return 'green';
    case 'in_progress':
      return 'blue';
    case 'delayed':
      return 'red';
    case 'on_hold':
      return 'yellow';
    default:
      return 'neutral';
  }
}

export function paymentTone(
  status: PaymentStatus,
): 'neutral' | 'blue' | 'green' | 'red' | 'orange' | 'yellow' {
  switch (status) {
    case 'paid':
      return 'green';
    case 'partial':
      return 'blue';
    case 'overdue':
      return 'red';
    case 'pending':
      return 'orange';
    default:
      return 'neutral';
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
