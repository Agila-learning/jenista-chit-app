import { useQuery } from '@tanstack/react-query';
import { fetchClient } from '../api/client';

export const useLedgerEntries = () => {
  return useQuery({
    queryKey: ['ledger'],
    queryFn: () => fetchClient('/ledgers'),
  });
};
