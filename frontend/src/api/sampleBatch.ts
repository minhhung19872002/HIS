import apiClient from './client';

export interface SampleBatchItemDto {
  id: string;
  sampleBarcode?: string;
  sampleType?: string;
  testName: string;
  patientName: string;
  patientCode: string;
  collectedAt: string;
  collectedBy?: string;
  collectorName?: string;
  priority: number;
  status: number;
}

export interface SampleBatchDto {
  batchName: string;
  count: number;
  items: SampleBatchItemDto[];
}

export interface SampleBatchReportDto {
  date: string;
  batches: SampleBatchDto[];
  total: number;
}

export async function getSampleBatches(date?: string): Promise<SampleBatchReportDto> {
  const { data } = await apiClient.get<SampleBatchReportDto>('/sample-batches', {
    params: { date },
  });
  return data;
}
