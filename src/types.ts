import { DataFrame, Field, Vector } from '@grafana/data';

export interface PanelOptions {
  center_lat: number;
  center_lon: number;
  zoom: number;
}

export const defaults: PanelOptions = {
  center_lat: 49.205292,
  center_lon: 9.488106,
  zoom: 18,
};

export interface Buffer extends Vector {
  buffer: any;
}

export interface FieldBuffer extends Field<any, Vector> {
  values: Buffer;
}

export interface Frame extends DataFrame {
  fields: FieldBuffer[];
}
