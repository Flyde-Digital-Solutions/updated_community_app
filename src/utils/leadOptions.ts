import type { DropdownOption } from '../components/molecules/DropdownField';

export const LEAD_GENDER_OPTIONS: DropdownOption[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

export const GST_TREATMENT_OPTIONS: DropdownOption[] = [
  { label: 'Business - GST Registered', value: 'business_gst' },
  { label: 'Business - Not Registered', value: 'business_none' },
  { label: 'Consumer', value: 'consumer' },
  { label: 'Overseas', value: 'overseas' },
];

export const INDIAN_STATE_OPTIONS: DropdownOption[] = [
  ['Andaman and Nicobar Islands', 'AN'],
  ['Andhra Pradesh', 'AP'],
  ['Arunachal Pradesh', 'AR'],
  ['Assam', 'AS'],
  ['Bihar', 'BR'],
  ['Chandigarh', 'CH'],
  ['Chhattisgarh', 'CT'],
  ['Dadra and Nagar Haveli and Daman and Diu', 'DN'],
  ['Delhi', 'DL'],
  ['Goa', 'GA'],
  ['Gujarat', 'GJ'],
  ['Haryana', 'HR'],
  ['Himachal Pradesh', 'HP'],
  ['Jammu and Kashmir', 'JK'],
  ['Jharkhand', 'JH'],
  ['Karnataka', 'KA'],
  ['Kerala', 'KL'],
  ['Ladakh', 'LA'],
  ['Lakshadweep', 'LD'],
  ['Madhya Pradesh', 'MP'],
  ['Maharashtra', 'MH'],
  ['Manipur', 'MN'],
  ['Meghalaya', 'ML'],
  ['Mizoram', 'MZ'],
  ['Nagaland', 'NL'],
  ['Odisha', 'OR'],
  ['Puducherry', 'PY'],
  ['Punjab', 'PB'],
  ['Rajasthan', 'RJ'],
  ['Sikkim', 'SK'],
  ['Tamil Nadu', 'TN'],
  ['Telangana', 'TS'],
  ['Tripura', 'TR'],
  ['Uttar Pradesh', 'UP'],
  ['Uttarakhand', 'UK'],
  ['West Bengal', 'WB'],
].map(([label, value]) => ({ label: `${label} (${value})`, value }));

export const stateName = (code: string) =>
  INDIAN_STATE_OPTIONS.find(option => option.value === code)?.label.split(' (')[0] || code;
