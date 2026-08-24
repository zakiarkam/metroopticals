/**
 * Field vocabulary for editable storefront blocks.
 *
 * The admin renders forms straight from these definitions, and the storefront
 * reads the same block's `defaults` when nothing has been saved yet. Adding a
 * field to a block therefore updates the editor and the shipped dummy content
 * in one edit, with no migration — the row is a single JSON column.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "image"
  | "link"
  | "boolean"
  | "select"
  | "repeater";

interface FieldBase {
  name: string;
  label: string;
  help?: string;
}

export interface TextField extends FieldBase {
  type: "text";
  placeholder?: string;
  maxLength?: number;
}

export interface TextareaField extends FieldBase {
  type: "textarea";
  rows?: number;
  maxLength?: number;
}

export interface ImageField extends FieldBase {
  type: "image";
  /** `width / height`, so the preview matches the real crop. */
  aspect?: string;
  recommended?: string;
}

export interface LinkField extends FieldBase {
  type: "link";
  placeholder?: string;
}

export interface BooleanField extends FieldBase {
  type: "boolean";
}

export interface SelectField extends FieldBase {
  type: "select";
  options: { value: string; label: string }[];
}

export interface RepeaterField extends FieldBase {
  type: "repeater";
  /** Singular noun used on the add button, e.g. "link". */
  itemLabel: string;
  /** Field on each item used as the row title in the editor. */
  titleField?: string;
  min?: number;
  max?: number;
  fields: Field[];
  defaultItem: Record<string, unknown>;
}

export type Field =
  | TextField
  | TextareaField
  | ImageField
  | LinkField
  | BooleanField
  | SelectField
  | RepeaterField;

export type BlockGroup =
  | "Global"
  | "Navigation"
  | "Home"
  | "Footer";

export interface BlockDefinition {
  key: string;
  label: string;
  group: BlockGroup;
  description: string;
  fields: Field[];
  defaults: Record<string, unknown>;
}

export type BlockData = Record<string, any>;

export interface SiteContentRecord {
  key: string;
  data: BlockData;
  updatedAt: string;
}
