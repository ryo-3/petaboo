export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'completed':
      return '完了';
    case 'in_progress':
      return '進行中';
    default:
      return '未着手';
  }
};

export const getPriorityText = (priority: string): string => {
  switch (priority) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    default:
      return '低';
  }
};

export const getPriorityIndicator = (priority: string): string => {
  switch (priority) {
    case 'high':
      return '🔴';
    case 'medium':
      return '🟡';
    default:
      return '🟢';
  }
};

export const getStatusColorForText = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'text-green-600';
    case 'in_progress':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};