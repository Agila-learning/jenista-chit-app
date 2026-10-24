import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  companyCode: string;
  companyName: string;
  legalName: string;
  registrationDetails?: string;
  phone: string;
  email: string;
  website?: string;
  address: string;
  logo?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema(
  {
    companyCode: { type: String, required: true, unique: true },
    companyName: { type: String, required: true },
    legalName: { type: String, required: true },
    registrationDetails: { type: String },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: { type: String },
    address: { type: String, required: true },
    logo: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
