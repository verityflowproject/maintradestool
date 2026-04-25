import type React from "react";

export interface OnboardingData {
  trade: string;
  businessName: string;
  firstName: string;
  teamSize: string;
  jobType: string;
  experienceYears: string;
  painPoints: string[];
  hourlyRate: number | "";
  partsMarkup: number | "";
  region: string;
  invoiceMethod: string;
  email: string;
}

export type StepProps = {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  advanceStep: (validator: () => boolean) => void;
  shaking: boolean;
};

export const defaultState: OnboardingData = {
  trade: "",
  businessName: "",
  firstName: "",
  teamSize: "",
  jobType: "",
  experienceYears: "",
  painPoints: [],
  hourlyRate: "",
  partsMarkup: "",
  region: "",
  invoiceMethod: "",
  email: "",
};
