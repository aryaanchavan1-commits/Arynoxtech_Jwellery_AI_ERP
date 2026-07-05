import { VoucherHelper } from '../renderer/utils/VoucherHelper';

describe('VoucherHelper', () => {
  test('getNextNumber calls dbRun and dbQuery correctly', async () => {
    const dbRun = jest.fn().mockResolvedValue({});
    const dbQuery = jest.fn().mockResolvedValue([{ last_number: 5 }]);
    const result = await VoucherHelper.getNextNumber(dbRun, dbQuery, 'Sale_Retail');
    expect(dbQuery).toHaveBeenCalled();
    expect(dbRun).toHaveBeenCalled();
    expect(result).toContain('SALE');
  });
});
