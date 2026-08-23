export type OverallStatus = "green" | "yellow" | "red" | string;

export type Place = {
  id: string | number;
  name?: string | null;
  latitude: number;
  longitude: number;
  overall_status?: OverallStatus | null;
};
