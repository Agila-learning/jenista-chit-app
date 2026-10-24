import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient } from '../api/client';

export const useChitGroups = () => {
  return useQuery({
    queryKey: ['chit-groups'],
    queryFn: () => fetchClient('/chit-groups'),
  });
};

export const useChitGroup = (id: string) => {
  return useQuery({
    queryKey: ['chit-groups', id],
    queryFn: () => fetchClient(`/chit-groups/${id}`),
    enabled: !!id,
  });
};

export const useCreateChitGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newGroup: any) => 
      fetchClient('/chit-groups', {
        method: 'POST',
        body: JSON.stringify(newGroup),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chit-groups'] });
    },
  });
};
