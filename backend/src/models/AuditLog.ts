import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface AuditLogAttributes {
  id: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'login' | 'logout';
  resource: string;
  resourceId: string | null;
  userId: string | null;
  userName: string | null;
  tenantId: string | null;
  previousValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  gxpRelevant: boolean;
  electronicSignature: string | null;
  reason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'resourceId' | 'userId' | 'userName' | 'tenantId' | 'previousValue' | 'newValue' | 'ipAddress' | 'userAgent' | 'gxpRelevant' | 'electronicSignature' | 'reason' | 'createdAt' | 'updatedAt'> {}

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: string;
  public action!: 'create' | 'read' | 'update' | 'delete' | 'export' | 'login' | 'logout';
  public resource!: string;
  public resourceId!: string | null;
  public userId!: string | null;
  public userName!: string | null;
  public tenantId!: string | null;
  public previousValue!: string | null;
  public newValue!: string | null;
  public ipAddress!: string | null;
  public userAgent!: string | null;
  public gxpRelevant!: boolean;
  public electronicSignature!: string | null;
  public reason!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    action: {
      type: DataTypes.ENUM('create', 'read', 'update', 'delete', 'export', 'login', 'logout'),
      allowNull: false,
    },
    resource: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    previousValue: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    newValue: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gxpRelevant: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    electronicSignature: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'AuditLogs',
    timestamps: true,
    underscored: false,
  }
);

export default AuditLog;
