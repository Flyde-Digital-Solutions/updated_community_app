export type SyncState = 'synced' | 'pending';

export interface PaymentOrderConfig {
  key: string;
  amount: number;
  orderId: string;
  description?: string;
  noPaymentRequired?: boolean;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  buildingId: string;
  buildingName: string;
}

export interface BuildingOption {
  id: string;
  name: string;
}

export interface Ticket {
  id: string;
  /** Database identifier used by ticket detail/mutation endpoints. */
  backendId?: string;
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  category: string;
  categoryId?: string;
  subCategory?: string;
  subCategoryName?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  memberName: string;
  createdById?: string;
  company: string;
  location: string;
  createdAt: string;
  assignedTo?: string;
  assignedToId?: string;
  clientId?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  syncState?: SyncState;
}

export interface Visitor {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  host: string;
  hostId?: string;
  purpose: string;
  visitDate: string;
  arrivalTime: string;
  departureTime?: string;
  status: 'Expected' | 'Checked In' | 'Checked Out' | 'No Show';
  badgeId?: string;
  checkInMethod?: string;
  checkInTime?: string;
  notes?: string;
  backendStatus?: string;
  syncState?: SyncState;
}

export interface DayPass {
  id: string;
  customerId?: string;
  memberId?: string;
  purchaseType?: 'customer' | 'member';
  bundleId?: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  date: string;
  passType: string;
  amount: number;
  status: string;
  kycVerified: boolean;
  rfidCard?: string;
  accessAreas: string[];
  gender?: 'Male' | 'Female' | 'Other';
  memberSince?: string;
  bookingSource?: 'MyHQ' | 'Our Portal' | 'Direct';
  checkInTime?: string;
  bookingFor?: string;
  bookedAt?: string;
  buildingName?: string;
  numberOfGuests?: number;
  paymentMethod?: 'credits' | 'razorpay';
  discountPercent?: number;
  discountReason?: string;
  discountStatus?: 'approved' | 'pending' | 'rejected';
  usingDefaultBuildingDiscount?: boolean;
  paymentUrl?: string;
  paymentOrder?: PaymentOrderConfig;
  syncState?: SyncState;
}

export interface OnDemandUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  createdAt: string;
  zohoContactId?: string;
}

export interface RoomBooking {
  id: string;
  room: string;
  roomId?: string;
  floor: string;
  date: string;
  startTime: string;
  endTime: string;
  memberId: string;
  guestId?: string;
  clientId?: string;
  memberName: string;
  company: string;
  attendees: number;
  purpose: string;
  status: 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'Pending' | 'Approval Pending' | 'Payment Pending';
  paymentMethod?: 'credits' | 'razorpay';
  discountPercent?: number;
  discountReason?: string;
  discountStatus?: 'approved' | 'pending' | 'rejected';
  usingDefaultBuildingDiscount?: boolean;
  paymentUrl?: string;
  paymentOrder?: PaymentOrderConfig;
  syncState?: SyncState;
}

export interface MeetingRoom {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  status: 'Available' | 'Unavailable';
  communityMaxDiscountPercent?: number;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  companyId: string;
  company: string;
  cabin: string;
  floor: string;
  status: 'Active' | 'Inactive';
  kycVerified: boolean;
  gender?: 'Male' | 'Female' | 'Other';
  memberSince?: string;
  bio?: string;
}

export interface Company {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  cabin: string;
  floor: string;
  status: 'Active' | 'Inactive';
  memberCount: number;
  outstandingAmount: number;
  industry?: string;
  memberSince?: string;
  leaseEnd?: string;
  monthlyRent?: number;
  website?: string;
  about?: string;
}

export interface Cabin {
  id: string;
  cabinNumber: string;
  floor: string;
  size: string;
  capacity: number;
  monthlyRent: number;
  status: 'Occupied' | 'Vacant';
  companyName?: string;
  companyId?: string;
  memberCount?: number;
  occupiedSince?: string;
  leaseEnd?: string;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string;
  category?: string;
  categoryId?: string;
  subcategory?: string;
  subcategoryId?: string;
  speaker?: string;
  speakerId?: string;
  speakers?: Array<{
    name: string;
    role?: string;
    profile?: string;
    link?: string;
    image?: string;
  }>;
  coverImage?: string;
  additionalImage?: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  buildingId?: string;
  buildingName?: string;
  isExternal?: boolean;
  venueAddress?: string;
  googleMapLink?: string;
  rsvpClosingDate?: string;
  rsvpClosingTime?: string;
  capacity: number;
  rsvpCount: number;
  attendees?: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    role?: string;
  }>;
  status: 'Draft' | 'Published' | 'Completed' | 'Cancelled';
  syncState?: SyncState;
}

export interface NotificationRecord {
  id: string;
  type: 'Announcement' | 'Event' | 'Billing' | 'Maintenance' | 'Visitor';
  title: string;
  message: string;
  audience: string;
  sentAt: string;
  sentBy?: string;
  readCount?: number;
  totalCount?: number;
  syncState?: SyncState;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  purpose: string;
  address?: string;
  pincode?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
  createdAt: string;
  kycStatus?: string;
  kycDocuments?: Array<{ name: string; url?: string }>;
  syncState?: SyncState;
}

export interface RfidCard {
  id: string;
  uid: string;
  status: 'Active' | 'Inactive' | 'Lost';
  assignedTo?: string;
  company?: string;
  accessAreas: string[];
  billingType?: 'FREE' | 'PAID';
  companyId?: string;
  syncState?: SyncState;
}

export interface FileAttachment {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export interface PrinterRequest {
  id: string;
  fileName: string;
  requestedBy: string;
  company: string;
  clientId?: string;
  memberId?: string;
  copies: number;
  color: boolean;
  printType?: 'bw' | 'color';
  paperSize?: 'A4' | 'A3' | 'Letter';
  sides?: 'single' | 'duplex';
  comments?: string;
  credits: number;
  status: 'Pending' | 'Ready' | 'Completed' | 'Cancelled';
  createdAt: string;
  attachment?: FileAttachment;
  documentUrl?: string;
  syncState?: SyncState;
}

export interface CommunityPost {
  id: string;
  author: string;
  type: 'Announcement' | 'Update' | 'Offer';
  message: string;
  createdAt: string;
  likes: number;
  liked: boolean;
  syncState?: SyncState;
}

export interface CommonArea {
  id: string;
  name: string;
  code: string;
  building: string;
  capacity: number;
  status: 'Available' | 'Unavailable';
  description: string;
  syncState?: SyncState;
}
