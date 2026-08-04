import { describe, expect, it } from 'vitest';
import type { RadiologyOrderItemDto } from '../api/ris';
import { detectModality, statusKey } from './radiologyMappers';

const makeItem = (values: Partial<RadiologyOrderItemDto>): RadiologyOrderItemDto => ({
  id: 'item-1',
  serviceId: 'service-1',
  serviceCode: '',
  serviceName: '',
  serviceType: '',
  quantity: 1,
  price: 0,
  insurancePrice: 0,
  status: '',
  hasResult: false,
  hasImages: false,
  ...values,
});

describe('statusKey', () => {
  it.each([
    ['Cho thuc hien', 'scheduled'],
    ['Da hen', 'scheduled'],
    ['Dang thuc hien', 'imaging'],
    ['Đang chụp', 'imaging'],
    ['Da thuc hien', 'reading'],
    ['Reading', 'reading'],
    ['Da tra ket qua', 'reported'],
    ['Da duyet', 'reported'],
    ['Da huy', 'cancelled'],
  ] as const)('phân loại trạng thái API %s thành %s', (status, expected) => {
    expect(statusKey(status)).toBe(expected);
  });
});

describe('detectModality', () => {
  it('ưu tiên mã Siêu âm khi API cũ trả nhầm serviceType MRI', () => {
    const modality = detectModality(makeItem({
      serviceCode: 'SA_GIAP',
      serviceName: 'Siêu âm tuyến giáp',
      serviceType: 'MRI',
    }));

    expect(modality.v).toBe('US');
  });

  it('ưu tiên mã X-Quang khi API cũ trả nhầm serviceType MRI', () => {
    const modality = detectModality(makeItem({
      serviceCode: 'XQ_NGUC',
      serviceName: 'X-Quang ngực thẳng',
      serviceType: 'MRI',
    }));

    expect(modality.v).toBe('XR');
  });

  it.each([
    ['CT_SO_NAO', 'CT sọ não', 'CT'],
    ['CHT_COT_SONG', 'Cộng hưởng từ cột sống', 'MRI'],
    ['MAM_VU', 'Nhũ ảnh', 'MAM'],
  ] as const)('nhận diện %s thành %s', (serviceCode, serviceName, expected) => {
    expect(detectModality(makeItem({ serviceCode, serviceName })).v).toBe(expected);
  });
});
