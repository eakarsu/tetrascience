import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TenantAttributes {
  id: string;
  name: string;
  slug: string;
  industry: 'pharma' | 'biotech' | 'cro' | 'academic';
  plan: 'enterprise' | 'professional' | 'starter';
  status: 'active' | 'suspended' | 'trial';
  dataIsolation: 'full' | 'shared' | 'hybrid';
  maxUsers: number;
  maxStorage: number;
  contactEmail: string;
  contactName: string | null;
  settings: object | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TenantCreationAttributes extends Optional<TenantAttributes, 'id' | 'contactName' | 'settings' | 'createdAt' | 'updatedAt'> {}

class Tenant extends Model<TenantAttributes, TenantCreationAttributes> implements TenantAttributes {
  public id!: string;
  public name!: string;
  public slug!: string;
  public industry!: 'pharma' | 'biotech' | 'cro' | 'academic';
  public plan!: 'enterprise' | 'professional' | 'starter';
  public status!: 'active' | 'suspended' | 'trial';
  public dataIsolation!: 'full' | 'shared' | 'hybrid';
  public maxUsers!: number;
  public maxStorage!: number;
  public contactEmail!: string;
  public contactName!: string | null;
  public settings!: object | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Tenant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    industry: {
      type: DataTypes.ENUM('pharma', 'biotech', 'cro', 'academic'),
      allowNull: false,
    },
    plan: {
      type: DataTypes.ENUM('enterprise', 'professional', 'starter'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'trial'),
      allowNull: false,
    },
    dataIsolation: {
      type: DataTypes.ENUM('full', 'shared', 'hybrid'),
      allowNull: false,
    },
    maxUsers: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    maxStorage: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contactName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'Tenants',
    timestamps: true,
    underscored: false,
  }
);

export default Tenant;
