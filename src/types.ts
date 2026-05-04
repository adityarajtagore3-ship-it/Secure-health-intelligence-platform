export type UserRole = 'patient' | 'doctor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  bio?: string;
  specialty?: string;
}

export interface HealthMetric {
  id?: string;
  userId: string;
  type: 'heart_rate' | 'steps' | 'sleep' | 'blood_pressure' | 'weight';
  value: number;
  unit: string;
  timestamp: any; // Firestore Timestamp
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  startTime: any;
  endTime?: any;
}
