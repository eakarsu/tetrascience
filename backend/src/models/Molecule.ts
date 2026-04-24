import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface MoleculeAttributes {
  id: string;
  name: string;
  smiles: string;
  molecularFormula: string;
  molecularWeight: number;
  logP: number | null;
  hbdCount: number | null;
  hbaCount: number | null;
  rotatableBonds: number | null;
  tpsa: number | null;
  category: 'small_molecule' | 'peptide' | 'antibody' | 'nucleic_acid';
  targetProtein: string | null;
  mechanism: string | null;
  status: 'active' | 'inactive' | 'screening';
  synonyms: string | null;
  description: string | null;
  source: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MoleculeCreationAttributes extends Optional<MoleculeAttributes, 'id' | 'logP' | 'hbdCount' | 'hbaCount' | 'rotatableBonds' | 'tpsa' | 'targetProtein' | 'mechanism' | 'synonyms' | 'description' | 'source' | 'createdAt' | 'updatedAt'> {}

class Molecule extends Model<MoleculeAttributes, MoleculeCreationAttributes> implements MoleculeAttributes {
  public id!: string;
  public name!: string;
  public smiles!: string;
  public molecularFormula!: string;
  public molecularWeight!: number;
  public logP!: number | null;
  public hbdCount!: number | null;
  public hbaCount!: number | null;
  public rotatableBonds!: number | null;
  public tpsa!: number | null;
  public category!: 'small_molecule' | 'peptide' | 'antibody' | 'nucleic_acid';
  public targetProtein!: string | null;
  public mechanism!: string | null;
  public status!: 'active' | 'inactive' | 'screening';
  public synonyms!: string | null;
  public description!: string | null;
  public source!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Molecule.init(
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
    smiles: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    molecularFormula: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    molecularWeight: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    logP: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    hbdCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    hbaCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rotatableBonds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tpsa: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM('small_molecule', 'peptide', 'antibody', 'nucleic_acid'),
      allowNull: false,
    },
    targetProtein: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mechanism: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'screening'),
      allowNull: false,
    },
    synonyms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
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
    tableName: 'Molecules',
    timestamps: true,
    underscored: false,
  }
);

export default Molecule;
