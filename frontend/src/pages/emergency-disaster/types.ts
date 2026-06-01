export type ActivateFormValues = {
  description: string;
  eventType?: string;
  alertLevel: number;
  location: string;
  estimatedCasualties?: number | string;
};

export type VictimFormValues = {
  name?: string;
  estimatedAge?: number | string;
  gender?: string;
  currentLocation?: string;
  injuries?: string;
  triageCategory?: string;
};
