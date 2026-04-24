import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface KnowledgeEdgeAttributes {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: 'targets' | 'inhibits' | 'activates' | 'measured_in' | 'associated_with' | 'part_of';
  weight: number | null;
  evidence: string | null;
  source: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KnowledgeEdgeCreationAttributes extends Optional<KnowledgeEdgeAttributes, 'id' | 'weight' | 'evidence' | 'source' | 'createdAt' | 'updatedAt'> {}

class KnowledgeEdge extends Model<KnowledgeEdgeAttributes, KnowledgeEdgeCreationAttributes> implements KnowledgeEdgeAttributes {
  public id!: string;
  public sourceNodeId!: string;
  public targetNodeId!: string;
  public relationshipType!: 'targets' | 'inhibits' | 'activates' | 'measured_in' | 'associated_with' | 'part_of';
  public weight!: number | null;
  public evidence!: string | null;
  public source!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

KnowledgeEdge.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sourceNodeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    targetNodeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    relationshipType: {
      type: DataTypes.ENUM('targets', 'inhibits', 'activates', 'measured_in', 'associated_with', 'part_of'),
      allowNull: false,
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    evidence: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'KnowledgeEdges',
    timestamps: true,
    underscored: false,
  }
);

export default KnowledgeEdge;
