import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  code: string;
  name: string;
  description?: string;
  permissions: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    description: { type: String },
    permissions: [{ type: String }],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Role = mongoose.model<IRole>('Role', RoleSchema);
