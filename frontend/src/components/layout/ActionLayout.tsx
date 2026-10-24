import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../common/Button';
import { Plus, Eye, Edit, CheckCircle } from 'lucide-react';

export type ActionType = 'ADD' | 'VIEW' | 'MODIFY' | 'APPROVE' | null;

interface ActionLayoutProps {
  title: string;
  allowedActions?: ActionType[];
  defaultAction?: ActionType;
  actionLabels?: { [key in 'ADD' | 'VIEW' | 'MODIFY' | 'APPROVE']?: string };
  onActionSelect?: (action: ActionType) => void;
  renderContent: (action: ActionType) => ReactNode;
  onConfirm?: () => void;
  onConfirmApprove?: () => void;
  onCancel?: () => void;
  onClear?: () => void;
}

export const ActionLayout = ({
  title,
  allowedActions = ['ADD', 'VIEW', 'MODIFY', 'APPROVE'],
  defaultAction = null,
  actionLabels,
  onActionSelect,
  renderContent,
  onConfirm,
  onConfirmApprove,
  onCancel,
  onClear
}: ActionLayoutProps) => {
  const [activeAction, setActiveAction] = useState<ActionType>(defaultAction);

  const handleAction = (action: ActionType) => {
    setActiveAction(action);
    if (onActionSelect) onActionSelect(action);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f0f4f9] overflow-hidden">
      {/* Top Action Bar */}
      <div className="px-4 py-2 border-b border-neutral-200 bg-[#f0f4f9] flex flex-wrap gap-4 items-center justify-between shrink-0">
        <h2 className="text-lg font-bold text-primary-900">{title}</h2>
        <div className="flex flex-wrap gap-2">
          {allowedActions.includes('ADD') && (
            <Button 
              size="sm"
              variant={activeAction === 'ADD' ? 'primary' : 'secondary'} 
              onClick={() => handleAction('ADD')}
              className="flex items-center"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> {actionLabels?.ADD || 'Add'}
            </Button>
          )}
          {allowedActions.includes('VIEW') && (
            <Button 
              size="sm"
              variant={activeAction === 'VIEW' ? 'primary' : 'secondary'} 
              onClick={() => handleAction('VIEW')}
              className="flex items-center"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" /> {actionLabels?.VIEW || 'View'}
            </Button>
          )}
          {allowedActions.includes('MODIFY') && (
            <Button 
              size="sm"
              variant={activeAction === 'MODIFY' ? 'primary' : 'secondary'} 
              onClick={() => handleAction('MODIFY')}
              className="flex items-center"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5" /> {actionLabels?.MODIFY || 'Modify'}
            </Button>
          )}
          {allowedActions.includes('APPROVE') && (
            <Button 
              size="sm"
              variant={activeAction === 'APPROVE' ? 'primary' : 'secondary'} 
              onClick={() => handleAction('APPROVE')}
              className="flex items-center"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-neutral-50/50">
        {(() => {
          const content = renderContent(activeAction);
          if (content) return content;
          return (
            <div className="h-full flex items-center justify-center text-neutral-400 border-2 border-dashed border-neutral-200 rounded-lg">
              <p>Select an action above to begin</p>
            </div>
          );
        })()}
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex flex-wrap justify-end gap-3 shrink-0">
        <button 
          className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-900"
          onClick={() => { setActiveAction(null); if(onClear) onClear(); }}
        >
          Clear
        </button>
        {onCancel && (
          <button 
            className="px-4 py-2 text-sm font-medium text-danger hover:text-danger-dark bg-white border border-danger rounded-md hover:bg-danger-light focus:outline-none focus:ring-2 focus:ring-danger"
            onClick={() => { setActiveAction(null); if(onCancel) onCancel(); }}
          >
            Cancel
          </button>
        )}
        {onConfirm && (
          <button 
            className="px-4 py-2 text-sm font-medium text-white bg-primary-900 rounded-md hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900"
            onClick={onConfirm} 
            disabled={!activeAction}
          >
            Confirm
          </button>
        )}
        {onConfirmApprove && (
          <button 
            className="px-4 py-2 text-sm font-medium text-white bg-success rounded-md hover:bg-success-dark disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success"
            onClick={onConfirmApprove} 
            disabled={!activeAction}
          >
            Confirm & Approve
          </button>
        )}
      </div>
    </div>
  );
};
