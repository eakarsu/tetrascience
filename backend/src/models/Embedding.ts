import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface EmbeddingAttributes {
  id: string;
  name: string;
  sourceText: string;
  sourceType: 'molecule' | 'document' | 'assay' | 'entity';
  modelName: string;
  dimensions: number;
  vector: string;
  metadata: object | null;
  similarityScore: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmbeddingCreationAttributes extends Optional<EmbeddingAttributes, 'id' | 'metadata' | 'similarityScore' | 'createdAt' | 'updatedAt'> {}

class Embedding extends Model<EmbeddingAttributes, EmbeddingCreationAttributes> implements EmbeddingAttributes {
  public id!: string;
  public name!: string;
  public sourceText!: string;
  public sourceType!: 'molecule' | 'document' | 'assay' | 'entity';
  public modelName!: string;
  public dimensions!: number;
  public vector!: string;
  public metadata!: object | null;
  public similarityScore!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Embedding.init(
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
    sourceText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sourceType: {
      type: DataTypes.ENUM('molecule', 'document', 'assay', 'entity'),
      allowNull: false,
    },
    modelName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dimensions: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    vector: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    similarityScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'Embeddings',
    timestamps: true,
    underscored: false,
  }
);

export default Embedding;
