import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface RoleAttributes {
  id: string;
  name: string;
  permissions: object;
  tenantId: string | null;
  description: string | null;
  isSystem: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RoleCreationAttributes extends Optional<RoleAttributes, 'id' | 'tenantId' | 'description' | 'isSystem' | 'createdAt' | 'updatedAt'> {}

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: string;
  public name!: string;
  public permissions!: object;
  public tenantId!: string | null;
  public description!: string | null;
  public isSystem!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Role.init(
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
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'Roles',
    timestamps: true,
    underscored: false,
  }
);

export default Role;
