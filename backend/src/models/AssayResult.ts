import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface AssayResultAttributes {
  id: string;
  assayName: string;
  assayType: 'binding' | 'functional' | 'ADME' | 'toxicity' | 'cell_viability';
  moleculeId: string | null;
  targetProtein: string | null;
  result: number;
  unit: string;
  concentration: number | null;
  concentrationUnit: string | null;
  plateId: string | null;
  wellPosition: string | null;
  operator: string | null;
  runDate: Date | null;
  status: 'validated' | 'pending' | 'failed' | 'flagged';
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AssayResultCreationAttributes extends Optional<AssayResultAttributes, 'id' | 'moleculeId' | 'targetProtein' | 'concentration' | 'concentrationUnit' | 'plateId' | 'wellPosition' | 'operator' | 'runDate' | 'notes' | 'createdAt' | 'updatedAt'> {}

class AssayResult extends Model<AssayResultAttributes, AssayResultCreationAttributes> implements AssayResultAttributes {
  public id!: string;
  public assayName!: string;
  public assayType!: 'binding' | 'functional' | 'ADME' | 'toxicity' | 'cell_viability';
  public moleculeId!: string | null;
  public targetProtein!: string | null;
  public result!: number;
  public unit!: string;
  public concentration!: number | null;
  public concentrationUnit!: string | null;
  public plateId!: string | null;
  public wellPosition!: string | null;
  public operator!: string | null;
  public runDate!: Date | null;
  public status!: 'validated' | 'pending' | 'failed' | 'flagged';
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AssayResult.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    assayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assayType: {
      type: DataTypes.ENUM('binding', 'functional', 'ADME', 'toxicity', 'cell_viability'),
      allowNull: false,
    },
    moleculeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    targetProtein: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    result: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    concentration: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    concentrationUnit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    plateId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    wellPosition: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    operator: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    runDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('validated', 'pending', 'failed', 'flagged'),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'AssayResults',
    timestamps: true,
    underscored: false,
  }
);

export default AssayResult;
