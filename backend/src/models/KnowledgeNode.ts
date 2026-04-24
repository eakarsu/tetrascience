import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface KnowledgeNodeAttributes {
  id: string;
  label: string;
  nodeType: 'compound' | 'target' | 'assay' | 'disease' | 'pathway' | 'gene';
  properties: object | null;
  description: string | null;
  externalId: string | null;
  source: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KnowledgeNodeCreationAttributes extends Optional<KnowledgeNodeAttributes, 'id' | 'properties' | 'description' | 'externalId' | 'source' | 'createdAt' | 'updatedAt'> {}

class KnowledgeNode extends Model<KnowledgeNodeAttributes, KnowledgeNodeCreationAttributes> implements KnowledgeNodeAttributes {
  public id!: string;
  public label!: string;
  public nodeType!: 'compound' | 'target' | 'assay' | 'disease' | 'pathway' | 'gene';
  public properties!: object | null;
  public description!: string | null;
  public externalId!: string | null;
  public source!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

KnowledgeNode.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nodeType: {
      type: DataTypes.ENUM('compound', 'target', 'assay', 'disease', 'pathway', 'gene'),
      allowNull: false,
    },
    properties: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    externalId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'KnowledgeNodes',
    timestamps: true,
    underscored: false,
  }
);

export default KnowledgeNode;
