import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient } from '../api/client';

// Types
export interface Customer {
  _id: string;
  userId?: { name: string; email: string; phone: string };
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  address: string;
  joinedDate: string;
}

// Hooks
export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchClient('/customers'),
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => fetchClient(`/customers/${id}`),
    enabled: !!id,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newCustomer: Partial<Customer>) => 
      fetchClient('/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};
