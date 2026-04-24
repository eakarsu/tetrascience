import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface EntityAttributes {
  id: string;
  surfaceForm: string;
  canonicalName: string;
  entityType: 'chemical' | 'protein' | 'gene' | 'disease' | 'assay' | 'organism';
  confidence: number;
  source: string | null;
  context: string | null;
  externalIds: object | null;
  resolved: boolean;
  resolvedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EntityCreationAttributes extends Optional<EntityAttributes, 'id' | 'source' | 'context' | 'externalIds' | 'resolved' | 'resolvedBy' | 'createdAt' | 'updatedAt'> {}

class Entity extends Model<EntityAttributes, EntityCreationAttributes> implements EntityAttributes {
  public id!: string;
  public surfaceForm!: string;
  public canonicalName!: string;
  public entityType!: 'chemical' | 'protein' | 'gene' | 'disease' | 'assay' | 'organism';
  public confidence!: number;
  public source!: string | null;
  public context!: string | null;
  public externalIds!: object | null;
  public resolved!: boolean;
  public resolvedBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Entity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    surfaceForm: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    canonicalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityType: {
      type: DataTypes.ENUM('chemical', 'protein', 'gene', 'disease', 'assay', 'organism'),
      allowNull: false,
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    context: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    externalIds: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    resolvedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'Entities',
    timestamps: true,
    underscored: false,
  }
);

export default Entity;
